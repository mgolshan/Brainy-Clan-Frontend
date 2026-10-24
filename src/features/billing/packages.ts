import type {
  OfferPeriod,
  PackageKind,
  PaywallPackage,
  PeriodUnit,
} from '@/features/billing/storeTypes';

/**
 * Pure mapping from RevenueCat offering packages to the paywall's plans (F8): package type →
 * plan kind, per-month prices, the saving of longer plans against the monthly plan, free trials
 * and paid intro offers ("founding families"). Every price comes from the store; nothing here
 * is hard-coded except the store product IDs used as a fallback when a package has a custom type.
 */

/** The subset of a RevenueCat `PurchasesPackage` the paywall needs (keeps this testable). */
export interface RawIntroPrice {
  price: number;
  priceString: string;
  cycles: number;
  periodUnit: string;
  periodNumberOfUnits: number;
}

export interface RawPackage {
  identifier: string;
  /** RevenueCat `PACKAGE_TYPE` value (`MONTHLY`, `SIX_MONTH`, `ANNUAL`, `CUSTOM`, ...). */
  packageType: string;
  product: {
    identifier: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
    pricePerMonthString: string | null;
    introPrice: RawIntroPrice | null;
  };
}

/** Store product IDs (backend PLAN B10), same in App Store Connect and Google Play. */
export const PRODUCT_IDS: Record<Exclude<PackageKind, 'other'>, string> = {
  monthly: 'brainyclan_family_monthly',
  sixMonth: 'brainyclan_family_6months',
  annual: 'brainyclan_family_annual',
};

/** Length of each plan in months (for the saving against the monthly plan). */
export const PLAN_MONTHS: Record<Exclude<PackageKind, 'other'>, number> = {
  monthly: 1,
  sixMonth: 6,
  annual: 12,
};

const ORDER: Record<PackageKind, number> = { annual: 0, sixMonth: 1, monthly: 2, other: 3 };

/**
 * Plan kind of a package: its RevenueCat package type first, then (for custom packages) the
 * store product ID (Google adds `:base-plan` to it).
 */
export function packageKind(packageType: string, productId: string): PackageKind {
  switch (packageType) {
    case 'MONTHLY':
      return 'monthly';
    case 'SIX_MONTH':
      return 'sixMonth';
    case 'ANNUAL':
      return 'annual';
  }
  const base = productId.split(':')[0];
  const match = (Object.keys(PRODUCT_IDS) as Exclude<PackageKind, 'other'>[]).find(
    (kind) => PRODUCT_IDS[kind] === base,
  );
  return match ?? 'other';
}

const UNITS: Record<string, PeriodUnit> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

function period(unit: string, count: number): OfferPeriod | null {
  const mapped = UNITS[unit.toUpperCase()];
  return mapped && Number.isFinite(count) && count > 0 ? { unit: mapped, count } : null;
}

/**
 * Saving of a longer plan against paying monthly for the same time, in whole percent, rounded
 * down (never overstated). Null when there is no monthly plan to compare with, the currencies
 * differ or there is no saving.
 */
export function savingPercent(
  price: number,
  months: number,
  monthly: { price: number; currencyCode: string } | undefined,
  currencyCode: string,
): number | null {
  if (!monthly || months <= 1 || monthly.currencyCode !== currencyCode) return null;
  const full = monthly.price * months;
  if (!(full > 0) || !(price > 0)) return null;
  const percent = Math.floor((1 - price / full) * 100 + 1e-9);
  return percent > 0 ? percent : null;
}

/**
 * Maps the current offering's packages to paywall plans, annual first. `introEligible` (iOS
 * eligibility check) hides trials/intro offers the store account can't get any more.
 */
export function toPaywallPackages(
  raw: readonly RawPackage[],
  introEligible: (productId: string) => boolean = () => true,
): PaywallPackage[] {
  const kinds = raw.map((pkg) => packageKind(pkg.packageType, pkg.product.identifier));
  const monthlyIndex = kinds.indexOf('monthly');
  const monthly = monthlyIndex >= 0 ? raw[monthlyIndex]?.product : undefined;

  const result = raw.map((pkg, index): PaywallPackage => {
    const kind = kinds[index] ?? 'other';
    const { product } = pkg;
    const months = kind === 'other' ? null : PLAN_MONTHS[kind];
    const intro = introEligible(product.identifier) ? product.introPrice : null;
    const introPeriod = intro ? period(intro.periodUnit, intro.periodNumberOfUnits) : null;
    const isFree = intro !== null && intro.price === 0;
    return {
      id: pkg.identifier,
      kind,
      priceString: product.priceString,
      pricePerMonthString:
        months !== null && months > 1 ? (product.pricePerMonthString ?? null) : null,
      savingPercent:
        months !== null
          ? savingPercent(product.price, months, monthly, product.currencyCode)
          : null,
      freeTrial:
        isFree && introPeriod
          ? { unit: introPeriod.unit, count: introPeriod.count * Math.max(1, intro.cycles) }
          : null,
      introOffer:
        intro && !isFree && introPeriod
          ? {
              priceString: intro.priceString,
              period: introPeriod,
              cycles: Math.max(1, intro.cycles),
            }
          : null,
      highlighted: kind === 'annual',
      title: product.title,
    };
  });
  return result.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

/** The plan selected by default: the highlighted (annual) one, else the first. */
export function defaultPackage(list: readonly PaywallPackage[]): PaywallPackage | undefined {
  return list.find((p) => p.highlighted) ?? list[0];
}
