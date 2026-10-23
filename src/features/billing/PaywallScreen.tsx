import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useIsAdmin, usePolicy } from '@/features/auth/hooks';
import {
  type PaywallResult,
  usePaywallActions,
  usePaywallPackages,
  useSubscription,
} from '@/features/billing/hooks';
import { store } from '@/features/billing/store';
import { type PaywallPackage, StoreError } from '@/features/billing/storeTypes';
import { Unlocks } from '@/features/billing/SubscriptionCard';
import { PRIVACY_URL, TERMS_URL } from '@/config/monetization';
import { openLegalPage, useLegal } from '@/features/legal/hooks';
import { errorMessage } from '@/lib/errorMessage';
import {
  Badge,
  Button,
  Card,
  Celebration,
  EmptyState,
  ErrorState,
  Icon,
  Loading,
  PressableScale,
  Screen,
  Text,
  useTheme,
} from '@/ui';

function done() {
  if (router.canGoBack()) router.back();
  else router.replace('/family');
}

function useStoreErrorText() {
  const { t } = useTranslation();
  return (error: unknown) =>
    error instanceof StoreError ? t(`billing.errors.${error.kind}`) : errorMessage(error, t);
}

function PackageOption({
  pkg,
  selected,
  onSelect,
}: {
  pkg: PaywallPackage;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const name =
    pkg.kind === 'annual'
      ? t('billing.paywall.annual')
      : pkg.kind === 'monthly'
        ? t('billing.paywall.monthly')
        : pkg.title;
  const price =
    pkg.kind === 'annual'
      ? t('billing.paywall.perYear', { price: pkg.priceString })
      : pkg.kind === 'monthly'
        ? t('billing.paywall.perMonth', { price: pkg.priceString })
        : pkg.priceString;
  return (
    <PressableScale
      onPress={onSelect}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={`${name}, ${price}`}
      accessibilityState={{ checked: selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: selected ? 2 : theme.borderWidth,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primarySoft : c.surface,
      }}>
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        color={selected ? c.primary : c.textMuted}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text weight="bold">{name}</Text>
          {pkg.kind === 'annual' ? (
            <Badge label={t('billing.paywall.bestValue')} tone="success" />
          ) : null}
        </View>
        {pkg.pricePerMonthString ? (
          <Text variant="caption" tone="muted">
            {t('billing.paywall.perMonthEquivalent', { price: pkg.pricePerMonthString })}
          </Text>
        ) : null}
      </View>
      <Text weight="bold">{price}</Text>
    </PressableScale>
  );
}

function ResultView({ result }: { result: PaywallResult }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const activated = result.kind === 'activated';
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      {activated ? (
        <Celebration />
      ) : (
        <Icon name="hourglass-outline" size={56} color={theme.colors.primary} />
      )}
      <Text variant="heading" align="center">
        {activated ? t('billing.paywall.welcomeTitle') : t('billing.paywall.delayedTitle')}
      </Text>
      <Text tone="muted" align="center">
        {activated ? t('billing.paywall.welcomeBody') : t('billing.paywall.delayedBody')}
      </Text>
      <Button title={t('common.done')} onPress={done} fullWidth />
    </View>
  );
}

/**
 * The Family plan paywall (F6). Only for adult admins whose policy allows purchases, and only in
 * a native build with RevenueCat configured (`store.available`); the entry is hidden otherwise.
 * Prices come from the store; after paying, the server confirms the tier (webhook / sync).
 */
export function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const policy = usePolicy();
  const isAdmin = useIsAdmin();
  const subscription = useSubscription();
  const appUserId = subscription.data?.revenuecat_app_user_id;
  const packages = usePaywallPackages(appUserId);
  const { run, step } = usePaywallActions(appUserId);
  const storeErrorText = useStoreErrorText();
  const [chosen, setChosen] = useState<string | null>(null);
  const legal = useLegal().data;

  const title = t('billing.paywall.title');
  const allowed = !!policy && policy.purchases_allowed && !policy.is_child && isAdmin;

  if (!store.available || !policy || !allowed) {
    return (
      <Screen title={title} back>
        <Card>
          <EmptyState
            title={t(store.available ? 'billing.paywall.notAllowed' : 'billing.paywall.notInBuild')}
            icon="lock-closed-outline"
          />
        </Card>
      </Screen>
    );
  }
  if (subscription.isPending) return <Loading />;
  if (subscription.isError || !subscription.data) {
    return (
      <Screen title={title} back>
        <ErrorState error={subscription.error} onRetry={() => void subscription.refetch()} />
      </Screen>
    );
  }

  const result = run.data;
  if (result && (result.kind === 'activated' || result.kind === 'delayed')) {
    return (
      <Screen title={title} back contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <ResultView result={result} />
      </Screen>
    );
  }

  if (subscription.data.tier === 'family') {
    return (
      <Screen title={title} back>
        <Card>
          <EmptyState title={t('billing.paywall.alreadyFamily')} icon="star" />
        </Card>
        <Button title={t('common.done')} variant="outline" onPress={done} />
      </Screen>
    );
  }

  // Backend legal pages (`GET /legal`, localized) first; the website pages are the fallback
  // (`EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`, default https://brainyclan.com/…).
  const openTerms = () => openLegalPage(legal?.terms ? legal.terms.url : TERMS_URL);
  const openPrivacy = () => openLegalPage(legal?.privacy ? legal.privacy.url : PRIVACY_URL);
  const list = packages.data ?? [];
  const selected = list.find((p) => p.id === chosen) ?? list[0];
  const busy = run.isPending;
  const notice =
    result?.kind === 'cancelled'
      ? t('billing.paywall.cancelled')
      : result?.kind === 'nothingToRestore'
        ? t('billing.paywall.nothingToRestore')
        : null;

  return (
    <Screen title={title} subtitle={t('billing.paywall.subtitle')} back>
      <Card padding="lg" style={{ gap: theme.spacing.md }}>
        <Unlocks policy={policy} />
        <Text variant="caption" tone="muted">
          {t('billing.paywall.wholeFamily')}
        </Text>
      </Card>

      {packages.isPending ? (
        <Loading fill={false} />
      ) : packages.isError ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text tone="danger">{storeErrorText(packages.error)}</Text>
          <Button
            title={t('common.retry')}
            variant="outline"
            onPress={() => void packages.refetch()}
          />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState title={t('billing.paywall.noPackages')} icon="cart-outline" />
        </Card>
      ) : (
        <View
          style={{ gap: theme.spacing.sm }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('billing.paywall.choose')}>
          {list.map((pkg) => (
            <PackageOption
              key={pkg.id}
              pkg={pkg}
              selected={pkg.id === selected?.id}
              onSelect={() => setChosen(pkg.id)}
            />
          ))}
        </View>
      )}

      {step === 'activating' ? (
        <Text tone="muted" align="center">
          {t('billing.paywall.activating')}
        </Text>
      ) : null}
      {run.isError ? <Text tone="danger">{storeErrorText(run.error)}</Text> : null}
      {notice ? <Text tone="muted">{notice}</Text> : null}

      <Button
        title={t('billing.paywall.subscribe')}
        icon="star"
        size="lg"
        onPress={() => selected && run.mutate({ type: 'buy', packageId: selected.id })}
        loading={step === 'buying' || step === 'activating'}
        disabled={!selected || busy}
      />
      <Button
        title={t('billing.paywall.restore')}
        variant="ghost"
        onPress={() => run.mutate({ type: 'restore' })}
        loading={step === 'restoring'}
        disabled={busy}
      />

      <Text variant="caption" tone="muted" align="center">
        {t('billing.paywall.legal')}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md }}>
        <Button title={t('billing.paywall.terms')} variant="ghost" size="sm" onPress={openTerms} />
        <Button
          title={t('billing.paywall.privacy')}
          variant="ghost"
          size="sm"
          onPress={openPrivacy}
        />
      </View>
    </Screen>
  );
}
