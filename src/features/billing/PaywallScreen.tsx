import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Subscription } from '@/api/types';
import { useIsAdmin, usePolicy } from '@/features/auth/hooks';
import {
  OfferCodeButton,
  PendingReferralNotice,
  ReferralCodeSection,
} from '@/features/billing/CodeSections';
import {
  type PaywallResult,
  useManageSubscription,
  usePaywallActions,
  usePaywallPackages,
  useSubscription,
  useWebCheckoutLink,
} from '@/features/billing/hooks';
import { defaultPackage } from '@/features/billing/packages';
import { planSource } from '@/features/billing/source';
import { store } from '@/features/billing/store';
import { type OfferPeriod, type PaywallPackage, StoreError } from '@/features/billing/storeTypes';
import { Unlocks } from '@/features/billing/SubscriptionCard';
import { PRIVACY_URL, TERMS_URL } from '@/config/monetization';
import { openInAppBrowser, openLegalPage, useLegal } from '@/features/legal/hooks';
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

type TFn = TFunction;

/** "7 days", "1 year", ... in the app language. */
function useDuration() {
  const { t } = useTranslation();
  return (period: OfferPeriod) => t(`billing.period.${period.unit}`, { count: period.count });
}

function planName(t: TFn, pkg: PaywallPackage): string {
  switch (pkg.kind) {
    case 'annual':
      return t('billing.paywall.annual');
    case 'sixMonth':
      return t('billing.paywall.sixMonths');
    case 'monthly':
      return t('billing.paywall.monthly');
    default:
      return pkg.title;
  }
}

function planPrice(t: TFn, pkg: PaywallPackage): string {
  switch (pkg.kind) {
    case 'annual':
      return t('billing.paywall.perYear', { price: pkg.priceString });
    case 'sixMonth':
      return t('billing.paywall.perSixMonths', { price: pkg.priceString });
    case 'monthly':
      return t('billing.paywall.perMonth', { price: pkg.priceString });
    default:
      return pkg.priceString;
  }
}

/** The intro ("founding families") offer line, e.g. "$24.99 for 1 year". */
function useIntroText() {
  const { t } = useTranslation();
  const duration = useDuration();
  return (pkg: PaywallPackage): string | null => {
    const offer = pkg.introOffer;
    if (!offer) return null;
    if (offer.cycles <= 1) {
      return t('billing.paywall.introOnce', {
        price: offer.priceString,
        duration: duration(offer.period),
      });
    }
    return t('billing.paywall.introRecurring', {
      price: offer.priceString,
      unit:
        offer.period.count === 1 ? t(`billing.unit.${offer.period.unit}`) : duration(offer.period),
      duration: duration({ unit: offer.period.unit, count: offer.period.count * offer.cycles }),
    });
  };
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
  const duration = useDuration();
  const introText = useIntroText();
  const c = theme.colors;
  const name = planName(t, pkg);
  const price = planPrice(t, pkg);
  const trial = pkg.freeTrial
    ? t('billing.paywall.trial', { duration: duration(pkg.freeTrial) })
    : null;
  const intro = introText(pkg);
  const introLine = intro ? `${t('billing.paywall.foundingTitle')}: ${intro}` : null;
  const save =
    pkg.savingPercent !== null ? t('billing.paywall.save', { percent: pkg.savingPercent }) : null;
  const perMonth = pkg.pricePerMonthString
    ? t('billing.paywall.perMonthEquivalent', { price: pkg.pricePerMonthString })
    : null;
  const label = [name, price, perMonth, save, trial, introLine].filter(Boolean).join(', ');

  return (
    <PressableScale
      onPress={onSelect}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: selected || pkg.highlighted ? 2 : theme.borderWidth,
        borderColor: selected ? c.primary : pkg.highlighted ? c.success : c.border,
        backgroundColor: selected ? c.primarySoft : c.surface,
      }}>
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        color={selected ? c.primary : c.textMuted}
      />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}>
          <Text weight="bold">{name}</Text>
          {pkg.highlighted ? <Badge label={t('billing.paywall.bestValue')} tone="success" /> : null}
          {save ? <Badge label={save} tone="primary" /> : null}
        </View>
        {perMonth ? (
          <Text variant="caption" tone="muted">
            {perMonth}
          </Text>
        ) : null}
        {trial ? (
          <View style={{ flexDirection: 'row' }}>
            <Badge label={trial} tone="accent" icon="gift-outline" />
          </View>
        ) : null}
        {introLine ? (
          <Text variant="caption" weight="bold" tone="success">
            {introLine}
          </Text>
        ) : null}
      </View>
      <Text weight="bold" align="right" style={{ flexShrink: 1, maxWidth: '45%' }}>
        {price}
      </Text>
    </PressableScale>
  );
}

/** A running plan: managed on the web (Paddle) or in the store; "Manage subscription" for both. */
function ManagedPlan({ sub }: { sub: Subscription }) {
  const { t } = useTranslation();
  const manage = useManageSubscription();
  const storeErrorText = useStoreErrorText();
  const web = planSource(sub) === 'web';
  return (
    <>
      <Card>
        <EmptyState
          title={web ? t('billing.managedOnWebTitle') : t('billing.paywall.alreadyFamily')}
          body={web ? t('billing.managedOnWebBody') : t('billing.paywall.alreadyFamilyStore')}
          icon={web ? 'globe-outline' : 'star'}
        />
      </Card>
      {sub.store ? (
        <Button
          title={t('billing.manage')}
          icon="settings-outline"
          onPress={() => manage.mutate(sub)}
          loading={manage.isPending}
        />
      ) : null}
      {manage.isError ? <Text tone="danger">{storeErrorText(manage.error)}</Text> : null}
      <Button title={t('common.done')} variant="outline" onPress={done} />
    </>
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
  const source = subscription.data ? planSource(subscription.data) : 'none';
  const allowed = !!policy && policy.purchases_allowed && !policy.is_child && isAdmin;
  // Only asks the server when this family could buy (no running plan); `link_allowed` decides.
  const webLink = useWebCheckoutLink(allowed && !!subscription.data && source === 'none');
  const storeErrorText = useStoreErrorText();
  const [chosen, setChosen] = useState<string | null>(null);
  const legal = useLegal().data;

  const title = t('billing.paywall.title');

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

  // One plan per family from one source: a running web (Paddle) or store plan hides the
  // purchase options; "Manage subscription" opens the right place (server-given link).
  if (source !== 'none') {
    return (
      <Screen title={title} back>
        <ManagedPlan sub={subscription.data} />
      </Screen>
    );
  }

  // Backend legal pages (`GET /legal`, localized) first; the website pages are the fallback
  // (`EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`, default https://brainyclan.com/…).
  const openTerms = () => openLegalPage(legal?.terms ? legal.terms.url : TERMS_URL);
  const openPrivacy = () => openLegalPage(legal?.privacy ? legal.privacy.url : PRIVACY_URL);
  const list = packages.data ?? [];
  const selected = list.find((p) => p.id === chosen) ?? defaultPackage(list);
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
      <PendingReferralNotice />
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
      {webLink.data ? (
        <Button
          title={t('billing.web.button')}
          icon="open-outline"
          variant="outline"
          onPress={() => webLink.data && openInAppBrowser(webLink.data)}
        />
      ) : null}

      <ReferralCodeSection />
      <OfferCodeButton />

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
