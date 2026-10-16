/**
 * Shared shapes for the RevenueCat wrapper (`store.ts` on iOS/Android, `store.web.ts` stub).
 * Screens only see these, never RevenueCat's own types.
 */

export type PackageKind = 'annual' | 'monthly' | 'other';

/** One purchasable option of the current offering, priced by the store. */
export interface PaywallPackage {
  /** RevenueCat package identifier (`$rc_annual`, `$rc_monthly`, ...). */
  id: string;
  kind: PackageKind;
  /** Localized price from the store, e.g. "$39.99". */
  priceString: string;
  /** Localized monthly equivalent for longer periods (annual), else null. */
  pricePerMonthString: string | null;
  /** The store's product title (shown for `other` packages). */
  title: string;
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

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
  /** Packages of the current offering, annual first. Empty when none is set up. */
  getPackages(appUserId: string): Promise<PaywallPackage[]>;
  /** Buys a package returned by `getPackages`. */
  purchase(packageId: string): Promise<PurchaseOutcome>;
  /** Restores store purchases; true when the `family` entitlement is active afterwards. */
  restore(appUserId: string): Promise<boolean>;
  /** Back to an anonymous RevenueCat user (sign-out). Never throws. */
  reset(): Promise<void>;
}
