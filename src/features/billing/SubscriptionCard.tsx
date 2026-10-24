import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Policy, Subscription } from '@/api/types';
import { useIsAdmin, usePolicy } from '@/features/auth/hooks';
import { PendingReferralNotice } from '@/features/billing/CodeSections';
import { useManageSubscription, useSubscription } from '@/features/billing/hooks';
import { applyPendingReferral, useReferralStore } from '@/features/billing/referral';
import { planSource } from '@/features/billing/source';
import { store as billingStore } from '@/features/billing/store';
import { errorMessage } from '@/lib/errorMessage';
import { formatDate } from '@/lib/format';
import { tierLabel } from '@/lib/labels';
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  Divider,
  ErrorState,
  Icon,
  Loading,
  SectionHeader,
  Text,
  useTheme,
} from '@/ui';

const STATUSES = ['active', 'grace', 'expired', 'none'] as const;
const STORES = ['app_store', 'play_store', 'stripe', 'paddle'] as const;

const STATUS_TONE: Record<(typeof STATUSES)[number], BadgeTone> = {
  active: 'success',
  grace: 'warning',
  expired: 'danger',
  none: 'neutral',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
      <Text tone="muted">{label}</Text>
      <Text weight="medium" style={{ flexShrink: 1 }} align="right">
        {value}
      </Text>
    </View>
  );
}

/** What the Family plan unlocks, read from the current (free) policy limits. */
export function Unlocks({ policy }: { policy: Policy }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { max_members, max_categories, max_active_goals } = policy.limits;
  const lines = [
    t('billing.unlockMembers', { count: max_members }),
    t('billing.unlockCategories', { count: max_categories }),
    max_active_goals !== null ? t('billing.unlockGoals', { count: max_active_goals }) : null,
  ].filter((line): line is string => line !== null);
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text weight="bold">{t('billing.unlocksTitle')}</Text>
      {lines.map((line) => (
        <View
          key={line}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="checkmark-circle" color={theme.colors.success} size={20} />
          <Text style={{ flex: 1 }}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function SubscriptionDetails({ sub, policy }: { sub: Subscription; policy: Policy }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const status = STATUSES.find((s) => s === sub.status);
  const store = STORES.find((s) => s === sub.store);
  const isFree = sub.tier === 'free';
  const source = planSource(sub);
  const manage = useManageSubscription();
  const date = sub.expires_at ? formatDate(sub.expires_at, i18n.language) : null;

  return (
    <Card padding="lg" style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="title" style={{ flex: 1 }}>
          {tierLabel(t, sub.tier)}
        </Text>
        {status && status !== 'none' ? (
          <Badge label={t(`billing.status.${status}`)} tone={STATUS_TONE[status]} />
        ) : null}
      </View>

      {date || sub.store ? (
        <View style={{ gap: theme.spacing.xs }}>
          {date ? (
            <DetailRow
              label={
                status === 'expired'
                  ? t('billing.expiredOn')
                  : sub.will_renew
                    ? t('billing.renewsOn')
                    : t('billing.expiresOn')
              }
              value={date}
            />
          ) : null}
          {sub.store ? (
            <DetailRow
              label={t('billing.store')}
              value={store ? t(`billing.stores.${store}`) : sub.store}
            />
          ) : null}
        </View>
      ) : null}

      {source === 'web' ? (
        <Text variant="caption" tone="muted">
          {t('billing.managedOnWebTitle')}
        </Text>
      ) : null}
      {source !== 'none' && sub.store ? (
        <>
          <Button
            title={t('billing.manage')}
            icon="settings-outline"
            variant="outline"
            onPress={() => manage.mutate(sub)}
            loading={manage.isPending}
          />
          {manage.isError ? <Text tone="danger">{errorMessage(manage.error, t)}</Text> : null}
        </>
      ) : null}

      {isFree && source === 'none' ? (
        <>
          <Divider />
          <Unlocks policy={policy} />
          {policy.purchases_allowed ? (
            billingStore.available ? (
              <Button
                title={t('billing.seePlan')}
                icon="star"
                onPress={() => router.push('/family-plan')}
              />
            ) : (
              // Web, Expo Go and builds without RevenueCat keys can't sell the plan.
              <Button title={t('billing.upgradeSoon')} icon="star" disabled onPress={() => {}} />
            )
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

/**
 * Family tab: plan status for admins (never children). Hidden while `/family/subscription`
 * is not deployed (404 → null).
 */
export function SubscriptionCard() {
  const { t } = useTranslation();
  const policy = usePolicy();
  const isAdmin = useIsAdmin();
  const subscription = useSubscription();
  const pendingCode = useReferralStore((s) => s.pendingCode);
  const canSetCode = !!policy && !policy.is_child && isAdmin;

  // A code typed at sign-up that couldn't be sent right after the family was created
  // (offline): try again once the admin is on the Family tab.
  useEffect(() => {
    if (canSetCode && pendingCode) void applyPendingReferral();
  }, [canSetCode, pendingCode]);

  if (!policy || policy.is_child || !isAdmin) return null;
  if (subscription.isSuccess && subscription.data === null) return null;

  return (
    <>
      <SectionHeader title={t('billing.title')} />
      {subscription.isPending ? (
        <Loading fill={false} />
      ) : subscription.isError ? (
        <ErrorState error={subscription.error} onRetry={() => void subscription.refetch()} />
      ) : subscription.data ? (
        <SubscriptionDetails sub={subscription.data} policy={policy} />
      ) : null}
      <PendingReferralNotice />
    </>
  );
}
