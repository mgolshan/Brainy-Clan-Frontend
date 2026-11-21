import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import type { FamilyTier, PricingTier, Subscription } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
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
  usePricingTiers,
  useSubscription,
  useWebCheckoutLink,
} from '@/features/billing/hooks';
import { isSameProduct, selectedPackage } from '@/features/billing/packages';
import {
  PLAN_CATALOG,
  type PaidTier,
  RECOMMENDED_TIER,
  defaultTier,
  familyOwnerAge,
  isOwnerTooYoung,
  isTooSmall,
  planMembers,
  planMinOwnerAge,
  planStudents,
  preselectedTier,
} from '@/features/billing/plans';
import { canChangePlanHere, planSource } from '@/features/billing/source';
import { store } from '@/features/billing/store';
import {
  type OfferPeriod,
  type PaywallPackage,
  type PlanChange,
  StoreError,
} from '@/features/billing/storeTypes';
import { Unlocks } from '@/features/billing/SubscriptionCard';
import { PRIVACY_URL, TERMS_URL } from '@/config/monetization';
import { useFamily } from '@/features/family/hooks';
import { openInAppBrowser, openLegalPage, useLegal } from '@/features/legal/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { tierLabel } from '@/lib/labels';
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
  current,
  onSelect,
}: {
  pkg: PaywallPackage;
  selected: boolean;
  /** The family's running product: shown, but not buyable again. */
  current: boolean;
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
  const currentText = current ? t('billing.paywall.currentPeriod') : null;
  const label = [name, currentText, price, perMonth, save, trial, introLine]
    .filter(Boolean)
    .join(', ');

  return (
    <PressableScale
      onPress={onSelect}
      haptic
      disabled={current}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: current }}
      style={{
        opacity: current ? 0.7 : 1,
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
          {currentText ? <Badge label={currentText} tone="neutral" /> : null}
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

interface TierChoice {
  tier: PaidTier;
  members: number;
  /** Adult seats + students for a tier with an adult cap (Classroom), else null. */
  seats: { adults: number; students: number } | null;
  current: boolean;
  recommended: boolean;
  /** The family already has more members than this tier allows (not selectable). */
  tooSmall: boolean;
  /** The tier's minimum owner age when the family owner is younger (not selectable), else null. */
  ownerTooYoung: number | null;
}

/** The plan cards: name, who it's for, member limit, one highlight (display catalog). */
function TierOption({
  choice,
  memberCount,
  selected,
  onSelect,
}: {
  choice: TierChoice;
  memberCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const { tier, members, seats, current, recommended, tooSmall, ownerTooYoung } = choice;
  const disabled = tooSmall || ownerTooYoung !== null;
  const name = tierLabel(t, tier);
  const bestFor = seats
    ? t('billing.plans.bestFor.classroom', seats)
    : t(`billing.plans.bestFor.${tier === 'big_clan' ? 'big_clan' : 'family'}`, { max: members });
  const membersLine = t('billing.plans.members', { count: members });
  const highlight = t(`billing.plans.highlight.${tier}`);
  const status = current
    ? t('billing.plans.yourPlan')
    : recommended
      ? t('billing.plans.recommended')
      : null;
  const tooSmallText = tooSmall ? t('billing.plans.tooSmall', { count: memberCount }) : null;
  const tooYoungText =
    ownerTooYoung !== null ? t('billing.plans.ownerTooYoung', { age: ownerTooYoung }) : null;
  const label = [name, status, bestFor, membersLine, highlight, tooSmallText, tooYoungText]
    .filter(Boolean)
    .join(', ');

  return (
    <PressableScale
      onPress={onSelect}
      haptic
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: selected ? 2 : theme.borderWidth,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primarySoft : c.surface,
        opacity: disabled ? 0.6 : 1,
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
          <Text variant="title">{name}</Text>
          {status ? (
            <Badge
              label={status}
              tone={current ? 'accent' : 'success'}
              icon={current ? 'star' : undefined}
            />
          ) : null}
        </View>
        <Text>{bestFor}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="people-outline" size={18} color={c.textMuted} />
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {membersLine}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="checkmark-circle" size={18} color={c.success} />
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {highlight}
          </Text>
        </View>
        {tooSmallText ? (
          <Text variant="caption" weight="bold" tone="warning">
            {tooSmallText}
          </Text>
        ) : null}
        {tooYoungText ? (
          <Text variant="caption" weight="bold" tone="warning">
            {tooYoungText}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

/**
 * Tiers the family owner is too young for (`GET /pricing` `min_owner_age`, else the catalog).
 * The family's own tier is never blocked (another billing period of it stays possible).
 */
function ownerBlockedTiers(
  currentTier: FamilyTier,
  ownerAge: number | null,
  pricing: readonly PricingTier[] | null | undefined,
): Map<PaidTier, number> {
  const blocked = new Map<PaidTier, number>();
  for (const plan of PLAN_CATALOG) {
    const min = planMinOwnerAge(plan.tier, pricing);
    if (plan.tier !== currentTier && min !== null && isOwnerTooYoung(min, ownerAge)) {
      blocked.set(plan.tier, min);
    }
  }
  return blocked;
}

/** The three paid plans for the picker (sizes: the server's limit for the current tier). */
function tierChoices(
  currentTier: FamilyTier,
  currentMaxMembers: number | undefined,
  memberCount: number,
  hasPaidPlan: boolean,
  blocked: ReadonlyMap<PaidTier, number>,
): TierChoice[] {
  const current =
    currentMaxMembers !== undefined ? { tier: currentTier, maxMembers: currentMaxMembers } : null;
  return PLAN_CATALOG.map((plan) => {
    const members = planMembers(plan.tier, current);
    const students = planStudents({ members, adults: plan.adults });
    const isCurrent = plan.tier === currentTier;
    return {
      tier: plan.tier,
      members,
      seats: plan.adults !== null && students !== null ? { adults: plan.adults, students } : null,
      current: isCurrent,
      recommended: !hasPaidPlan && plan.tier === RECOMMENDED_TIER,
      // The family's own plan stays selectable (another billing period) even when over its size.
      tooSmall: !isCurrent && isTooSmall(members, memberCount),
      ownerTooYoung: blocked.get(plan.tier) ?? null,
    };
  });
}

/**
 * A running plan that can't be changed in this app: managed on the web (Paddle: cancel and
 * subscribe again on the website), bought in the other store, or from an unknown source.
 * "Manage subscription" opens the right place.
 */
function ManagedPlan({ sub }: { sub: Subscription }) {
  const { t } = useTranslation();
  const manage = useManageSubscription();
  const storeErrorText = useStoreErrorText();
  const web = planSource(sub) === 'web';
  const otherStore = sub.store === 'app_store' || sub.store === 'play_store';
  return (
    <>
      <Card>
        <EmptyState
          title={
            web
              ? t('billing.managedOnWebTitle')
              : otherStore
                ? t('billing.paywall.otherStoreTitle')
                : t('billing.paywall.alreadyFamily')
          }
          body={
            web
              ? `${t('billing.managedOnWebBody')} ${t('billing.paywall.webChange')}`
              : otherStore
                ? t('billing.paywall.otherStoreBody', {
                    store: t(
                      `billing.stores.${sub.store === 'app_store' ? 'app_store' : 'play_store'}`,
                    ),
                  })
                : t('billing.paywall.alreadyFamilyStore')
          }
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

type FinalResult = Extract<PaywallResult, { kind: 'activated' | 'delayed' | 'scheduled' }>;

/** "Manage subscription" (server-given link: store page or Paddle portal) with its error line. */
function ManageButton({ sub }: { sub: Subscription }) {
  const { t } = useTranslation();
  const manage = useManageSubscription();
  const storeErrorText = useStoreErrorText();
  if (!sub.store) return null;
  return (
    <>
      <Button
        title={t('billing.manage')}
        icon="settings-outline"
        variant="outline"
        onPress={() => manage.mutate(sub)}
        loading={manage.isPending}
      />
      {manage.isError ? <Text tone="danger">{storeErrorText(manage.error)}</Text> : null}
    </>
  );
}

function ResultView({ result }: { result: FinalResult }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const plan = tierLabel(t, result.tier);
  const activated = result.kind === 'activated';
  const title =
    result.kind === 'activated'
      ? t('billing.paywall.welcomeTitle', { plan })
      : result.kind === 'scheduled'
        ? t('billing.paywall.scheduledTitle')
        : t('billing.paywall.delayedTitle');
  const body =
    result.kind === 'activated'
      ? t('billing.paywall.welcomeBody', { plan })
      : result.kind === 'scheduled'
        ? t('billing.paywall.scheduledBody', { plan })
        : t('billing.paywall.delayedBody', { plan });
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      {activated ? (
        <Celebration />
      ) : (
        <Icon
          name={result.kind === 'scheduled' ? 'calendar-outline' : 'hourglass-outline'}
          size={56}
          color={theme.colors.primary}
        />
      )}
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text tone="muted" align="center">
        {body}
      </Text>
      <Button title={t('common.done')} onPress={done} fullWidth />
    </View>
  );
}

/**
 * The paywall (F6, plans B12). Only for adult admins whose policy allows purchases, and only in
 * a native build with RevenueCat configured (`store.available`); the entry is hidden otherwise.
 * A plan picker first (Family / Big Clan / Classroom, sizes from the display catalog), then the
 * billing periods of that tier's offering with store prices. A running store plan is changed
 * through the store (upgrade / downgrade); a web plan is changed on the website. After paying,
 * the server confirms the tier (webhook / sync).
 */
export function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const policy = me?.policy;
  const isAdmin = useIsAdmin();
  const subscription = useSubscription();
  const family = useFamily();
  const sub = subscription.data;
  const appUserId = sub?.revenuecat_app_user_id;
  const currentTier: FamilyTier = sub?.tier ?? policy?.tier ?? 'free';
  const memberCount = family.data?.family.member_count ?? family.data?.members.length ?? 0;
  const allowed = !!policy && policy.purchases_allowed && !policy.is_child && isAdmin;
  // Classroom needs an owner aged 18+ (server: 403 `owner_too_young`). The purchaser is an
  // admin, not always the owner: the owner's age comes from data already loaded.
  const pricing = usePricingTiers(allowed && store.available);
  const ownerAge = me
    ? familyOwnerAge(
        { user: me.user, policyAge: policy?.age },
        family.data?.family ?? me.family,
        family.data?.members,
      )
    : null;
  const blocked = ownerBlockedTiers(currentTier, ownerAge, pricing.data);
  // `?plan=classroom` (teacher sign-up) opens with that tier selected; blocked tiers still fall
  // back to the default.
  const params = useLocalSearchParams<{ plan?: string | string[] }>();
  const [chosenTier, setChosenTier] = useState<PaidTier | null>(() => preselectedTier(params.plan));
  const tier =
    chosenTier && !blocked.has(chosenTier)
      ? chosenTier
      : defaultTier(currentTier, memberCount, [...blocked.keys()]);
  const packages = usePaywallPackages(appUserId, tier);
  const { run, step } = usePaywallActions(appUserId);
  const source = sub ? planSource(sub) : 'none';
  // Only asks the server when this family could buy (no running plan); `link_allowed` decides.
  const webLink = useWebCheckoutLink(
    allowed && !!sub && source === 'none' && !blocked.has(tier),
    tier,
  );
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
  if (subscription.isError || !sub) {
    return (
      <Screen title={title} back>
        <ErrorState error={subscription.error} onRetry={() => void subscription.refetch()} />
      </Screen>
    );
  }

  const result = run.data;
  if (
    result &&
    (result.kind === 'activated' || result.kind === 'delayed' || result.kind === 'scheduled')
  ) {
    return (
      <Screen title={title} back contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <ResultView result={result} />
      </Screen>
    );
  }

  // One plan per family from one source. A store plan bought in this store can change tier
  // here (the store handles the switch); web plans and plans from the other store can't.
  const changing = source === 'store' && canChangePlanHere(sub.store, Platform.OS);
  if (source !== 'none' && !changing) {
    return (
      <Screen title={title} back>
        <ManagedPlan sub={sub} />
      </Screen>
    );
  }

  // Backend legal pages (`GET /legal`, localized) first; the website pages are the fallback
  // (`EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`, default https://brainyclan.com/…).
  const openTerms = () => openLegalPage(legal?.terms ? legal.terms.url : TERMS_URL);
  const openPrivacy = () => openLegalPage(legal?.privacy ? legal.privacy.url : PRIVACY_URL);
  const choices = tierChoices(
    currentTier,
    policy.limits.max_members,
    memberCount,
    changing,
    blocked,
  );
  const tierBlocked = blocked.has(tier);
  const list = packages.data ?? [];
  const currentProduct = changing ? sub.product_id : null;
  const selected = selectedPackage(list, chosen, currentProduct);
  const change: PlanChange | null =
    changing && sub.product_id ? { oldProductId: sub.product_id } : null;
  const busy = run.isPending;
  const planName = tierLabel(t, tier);
  const notice =
    result?.kind === 'cancelled'
      ? t('billing.paywall.cancelled')
      : result?.kind === 'nothingToRestore'
        ? t('billing.paywall.nothingToRestore')
        : null;

  return (
    <Screen
      title={changing ? t('billing.paywall.changeTitle') : title}
      subtitle={changing ? undefined : t('billing.paywall.subtitle')}
      back>
      {changing ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text>{t('billing.paywall.changeBody', { plan: tierLabel(t, currentTier) })}</Text>
          <ManageButton sub={sub} />
        </Card>
      ) : (
        <Card padding="lg" style={{ gap: theme.spacing.md }}>
          <Unlocks policy={policy} />
          <Text variant="caption" tone="muted">
            {t('billing.paywall.wholeFamily')}
          </Text>
        </Card>
      )}

      <Text variant="caption" tone="muted">
        {t('billing.plans.sameFeatures')}
      </Text>
      <View
        style={{ gap: theme.spacing.sm }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('billing.plans.choose')}>
        {choices.map((choice) => (
          <TierOption
            key={choice.tier}
            choice={choice}
            memberCount={memberCount}
            selected={choice.tier === tier}
            onSelect={() => setChosenTier(choice.tier)}
          />
        ))}
      </View>

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
              current={isSameProduct(pkg.productId, currentProduct)}
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
        title={
          changing
            ? t('billing.paywall.switchTo', { plan: planName })
            : t('billing.paywall.subscribeTo', { plan: planName })
        }
        icon="star"
        size="lg"
        onPress={() =>
          selected && run.mutate({ type: 'buy', packageId: selected.id, tier, currentTier, change })
        }
        loading={step === 'buying' || step === 'activating'}
        disabled={!selected || busy || tierBlocked}
      />
      {changing ? null : (
        <Button
          title={t('billing.paywall.restore')}
          variant="ghost"
          onPress={() => run.mutate({ type: 'restore' })}
          loading={step === 'restoring'}
          disabled={busy}
        />
      )}
      {webLink.data && !changing ? (
        <Button
          title={t('billing.web.button')}
          icon="open-outline"
          variant="outline"
          onPress={() => webLink.data && openInAppBrowser(webLink.data)}
        />
      ) : null}

      {changing ? null : (
        <>
          <ReferralCodeSection />
          <OfferCodeButton />
        </>
      )}

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
