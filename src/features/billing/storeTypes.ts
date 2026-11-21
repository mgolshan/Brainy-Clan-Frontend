import type { PaidTier } from '@/features/billing/plans';

/**
 * Shared shapes for the RevenueCat wrapper (`store.ts` on iOS/Android, `store.web.ts` stub).
 * Screens only see these, never RevenueCat's own types.
 */

export type PackageKind = 'monthly' | 'sixMonth' | 'annual' | 'other';

export type PeriodUnit = 'day' | 'week' | 'month' | 'year';

/** A store period, e.g. 7 days or 1 year. */
export interface OfferPeriod {
  unit: PeriodUnit;
  count: number;
}

/** A paid introductory price (e.g. the "founding families" launch offer). */
export interface IntroOffer {
  /** Localized intro price from the store. */
  priceString: string;
  /** Billing period of the intro price. */
  period: OfferPeriod;
  /** How many periods the intro price applies (1 = paid once up front). */
  cycles: number;
}

/** One purchasable option of a tier's offering, priced by the store (see `packages.ts`). */
export interface PaywallPackage {
  /** Unique within the fetched offerings (the store wrapper prefixes the tier). */
  id: string;
  /** Store product id (`brainyclan_family_annual`; Google may add `:base-plan`). */
  productId: string;
  kind: PackageKind;
  /** Localized price from the store, e.g. "$39.99". */
  priceString: string;
  /** Localized monthly equivalent for plans longer than a month (store-computed), else null. */
  pricePerMonthString: string | null;
  /** Saving against paying monthly for the same time (whole %), from store prices; else null. */
  savingPercent: number | null;
  /** Free trial of the product (introductory offer with price 0), when eligible. */
  freeTrial: OfferPeriod | null;
  /** Paid introductory offer of the product, when eligible. */
  introOffer: IntroOffer | null;
  /** The plan the paywall highlights (annual). */
  highlighted: boolean;
  /** The store's product title (shown for `other` packages). */
  title: string;
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

/** Switching from a running store plan to another product (upgrade / downgrade / period). */
export interface PlanChange {
  /** Store product id of the running plan (`Subscription.product_id`). */
  oldProductId: string;
}

export type StoreErrorKind =
  'network' | 'notAllowed' | 'pending' | 'alreadyOwned' | 'unavailable' | 'store' | 'unknown';

/** A store/RevenueCat failure the paywall explains with `billing.errors.<kind>`. */
export class StoreError extends Error {
  constructor(
    readonly kind: StoreErrorKind,
    message?: string,
  ) {
    super(message ?? kind);
    this.name = 'StoreError';
  }
}

export interface StoreApi {
  /** RevenueCat is configured and usable in this build (never on web or in Expo Go). */
  readonly available: boolean;
  /** Configures the SDK once and logs in as the family's RevenueCat app user. */
  identify(appUserId: string): Promise<void>;
  /**
   * Packages of a tier's offering (`offerings.all[tier]`, the current offering as the Family
   * fallback), annual first. Empty when none is set up.
   */
  getPackages(appUserId: string, tier: PaidTier): Promise<PaywallPackage[]>;
  /**
   * Buys a package returned by `getPackages`. `change` (a running store plan) makes it a plan
   * change: Google Play replaces the old product; the App Store does it by itself (all products
   * are in one subscription group).
   */
  purchase(packageId: string, change?: PlanChange | null): Promise<PurchaseOutcome>;
  /**
   * Restores store purchases; the highest-ranked tier whose entitlement is active afterwards
   * (`family`, `big_clan`, `classroom`), or null.
   */
  restore(appUserId: string): Promise<PaidTier | null>;
  /** Back to an anonymous RevenueCat user (sign-out). Never throws. */
  reset(): Promise<void>;
  /**
   * Store country of the signed-in store account (ISO 3166-1 alpha-3, e.g. `USA`), or null when
   * unknown / not available. Never throws.
   */
  getStorefront(): Promise<string | null>;
  /**
   * How store offer codes are redeemed on this platform: the iOS code redemption sheet, a link
   * to Google Play's redeem page, or not at all (web, Expo Go).
   */
  readonly offerCodeRedemption: 'sheet' | 'link' | null;
  /** Shows the iOS offer code redemption sheet (only when `offerCodeRedemption` is `sheet`). */
  presentCodeRedemptionSheet(): Promise<void>;
}
