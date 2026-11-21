import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import type { CopyVariant, FlowKey } from '@/features/onboarding/flows';
import { FeatureRow, FtueSheet } from '@/features/onboarding/components/FtueSheet';
import { Button, Text, type IconName } from '@/ui';

interface Row {
  emoji: string;
  icon: IconName;
  title: string;
  body?: string;
}

/**
 * The flow's welcome (FTUE step 1), three short cards. Owners: play together, family goals,
 * safe chat. Invited members: "Welcome to {family}". Teachers: the Classroom welcome. Kids get
 * the titles only (fewer words, bigger pictures); seniors a hint about text size. "Let's go" and
 * "Skip" both close it for good (it never blocks play).
 */
export function WelcomeSheet({
  flow,
  variant,
  familyName,
  onClose,
}: {
  flow: Exclude<FlowKey, 'student'>;
  variant: CopyVariant;
  familyName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const kid = variant === 'kid';

  let title: string;
  let intro: string;
  let rows: Row[];
  if (flow === 'teacher') {
    title = t('onboarding.welcome.teacherTitle');
    intro = t('onboarding.welcome.teacherIntro');
    rows = [
      {
        emoji: '📋',
        icon: 'clipboard-outline',
        title: t('onboarding.welcome.teacherClassTitle'),
        body: t('onboarding.welcome.teacherClassBody'),
      },
      {
        emoji: '🎯',
        icon: 'flag-outline',
        title: t('onboarding.welcome.teacherGoalsTitle'),
        body: t('onboarding.welcome.teacherGoalsBody'),
      },
      {
        emoji: '📣',
        icon: 'megaphone-outline',
        title: t('onboarding.welcome.teacherChatTitle'),
        body: t('onboarding.welcome.teacherChatBody'),
      },
    ];
  } else if (flow === 'member') {
    title = kid
      ? t('onboarding.welcome.memberTitleKid', { family: familyName })
      : t('onboarding.welcome.memberTitle', { family: familyName });
    intro = kid ? t('onboarding.welcome.memberIntroKid') : t('onboarding.welcome.memberIntro');
    rows = [
      {
        emoji: '🦊',
        icon: 'happy-outline',
        title: kid ? t('onboarding.welcome.avatarTitleKid') : t('onboarding.welcome.avatarTitle'),
        body: kid ? undefined : t('onboarding.welcome.avatarBody'),
      },
      {
        emoji: '🎮',
        icon: 'game-controller-outline',
        title: kid ? t('onboarding.welcome.playTitleKid') : t('onboarding.welcome.playTitle'),
        body: kid ? undefined : t('onboarding.welcome.playBody'),
      },
      {
        emoji: '🎯',
        icon: 'flag-outline',
        title: kid ? t('onboarding.welcome.goalsTitleKid') : t('onboarding.welcome.goalsTitle'),
        body: kid ? undefined : t('onboarding.welcome.goalsBody'),
      },
    ];
  } else {
    title = t('onboarding.welcome.ownerTitle');
    intro = t('onboarding.welcome.ownerIntro');
    rows = [
      {
        emoji: '🎮',
        icon: 'game-controller-outline',
        title: t('onboarding.welcome.playTitle'),
        body: t('onboarding.welcome.playBody'),
      },
      {
        emoji: '🎯',
        icon: 'flag-outline',
        title: t('onboarding.welcome.goalsTitle'),
        body: t('onboarding.welcome.goalsBody'),
      },
      {
        emoji: '💬',
        icon: 'chatbubbles-outline',
        title: t('onboarding.welcome.chatTitle'),
        body: t('onboarding.welcome.chatBody'),
      },
    ];
  }

  return (
    <FtueSheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button
            title={kid ? t('onboarding.welcome.startKid') : t('onboarding.welcome.start')}
            icon="sparkles"
            onPress={onClose}
          />
          <Button title={t('onboarding.welcome.skip')} variant="ghost" onPress={onClose} />
        </>
      }>
      <Text tone="muted" style={styles.center}>
        {intro}
      </Text>
      {rows.map((row) => (
        <FeatureRow key={row.title} {...row} />
      ))}
      {variant === 'senior' ? (
        <Text variant="caption" tone="muted" style={styles.center}>
          {t('onboarding.welcome.seniorHint')}
        </Text>
      ) : null}
    </FtueSheet>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
