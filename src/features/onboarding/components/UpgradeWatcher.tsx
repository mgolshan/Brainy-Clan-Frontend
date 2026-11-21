import { router, useIsFocused, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Policy } from '@/api/types';
import { useMe } from '@/features/auth/hooks';
import type { PaidTier } from '@/features/billing/plans';
import { FeatureRow, FtueSheet } from '@/features/onboarding/components/FtueSheet';
import { upgradeSheetTier, upgradeStepKey } from '@/features/onboarding/flows';
import { runId, useFtueRun, useMarkSteps, useOnboarding } from '@/features/onboarding/hooks';
import { Button, Text, type IconName } from '@/ui';

interface Row {
  emoji: string;
  icon: IconName;
  title: string;
}

/** Where "Show me" leads for each plan. */
const SHOW_ME: Record<PaidTier, Href> = {
  family: '/goals',
  big_clan: '/invite',
  classroom: '/classroom',
};

function useRows(tier: PaidTier, policy: Policy): Row[] {
  const { t } = useTranslation();
  const members = policy.limits.max_members;
  const adults = policy.limits.max_adults ?? 0;
  const everything: Row[] = [
    { emoji: '🎯', icon: 'flag-outline', title: t('onboarding.upgrade.goals') },
    { emoji: '❤️', icon: 'heart-outline', title: t('onboarding.upgrade.secondChances') },
    { emoji: '🌍', icon: 'planet-outline', title: t('onboarding.upgrade.worlds') },
  ];
  switch (tier) {
    case 'family':
      return [
        {
          emoji: '👨‍👩‍👧',
          icon: 'people-outline',
          title: t('onboarding.upgrade.members', { count: members }),
        },
        ...everything,
      ];
    case 'big_clan':
      return [
        {
          emoji: '🏡',
          icon: 'people-outline',
          title: t('onboarding.upgrade.bigClanMembers', { count: members }),
        },
        { emoji: '🧑‍🤝‍🧑', icon: 'shield-checkmark-outline', title: t('onboarding.upgrade.coAdmins') },
        ...everything,
      ];
    case 'classroom':
      return [
        {
          emoji: '🏫',
          icon: 'school-outline',
          title: t('onboarding.upgrade.students', { count: Math.max(0, members - adults) }),
        },
        { emoji: '📋', icon: 'clipboard-outline', title: t('onboarding.upgrade.classTools') },
        { emoji: '📣', icon: 'megaphone-outline', title: t('onboarding.upgrade.chatModes') },
        ...everything,
      ];
  }
}

function UpgradeSheet({
  tier,
  policy,
  onClose,
}: {
  tier: PaidTier;
  policy: Policy;
  onClose: (showMe: boolean) => void;
}) {
  const { t } = useTranslation();
  const rows = useRows(tier, policy);
  return (
    <FtueSheet
      title={t('onboarding.upgrade.title')}
      onClose={() => onClose(false)}
      footer={
        <>
          <Button
            title={t('onboarding.upgrade.showMe')}
            icon="sparkles"
            onPress={() => onClose(true)}
          />
          <Button
            title={t('onboarding.upgrade.later')}
            variant="ghost"
            onPress={() => onClose(false)}
          />
        </>
      }>
      <Text tone="muted">{t(`onboarding.upgrade.intro.${tier}`)}</Text>
      {rows.map((row) => (
        <FeatureRow key={row.title} {...row} />
      ))}
    </FtueSheet>
  );
}

/**
 * The one-time "what's new for you" sheet after the family's plan switches to a paid tier
 * (family admins only; see `upgradeSheetTier`). Mounted in the tabs layout and shown only while
 * the tabs are on screen, so never in the middle of a game. Hidden on older servers (404).
 */
export function UpgradeWatcher() {
  const me = useMe().data;
  const onboarding = useOnboarding().data;
  const focused = useIsFocused();
  const { mutate } = useMarkSteps();
  const tier = upgradeSheetTier(onboarding, me);
  const shown = useFtueRun((s) =>
    tier ? s.shown.includes(runId(me?.user.id, upgradeStepKey(tier))) : true,
  );
  if (!focused || !tier || shown || !me) return null;
  return (
    <UpgradeSheet
      key={tier}
      tier={tier}
      policy={me.policy}
      onClose={(showMe) => {
        mutate([upgradeStepKey(tier)]);
        if (showMe) router.push(SHOW_ME[tier]);
      }}
    />
  );
}
