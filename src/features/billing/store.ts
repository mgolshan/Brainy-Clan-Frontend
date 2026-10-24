import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { FAMILY_ENTITLEMENT, REVENUECAT_API_KEY, purchasesSupported } from '@/config/monetization';
import { toPaywallPackages } from '@/features/billing/packages';
import { type StoreApi, StoreError, type StoreErrorKind } from '@/features/billing/storeTypes';
import { toAlpha3 } from '@/lib/countryCodes';

/**
 * RevenueCat on iOS/Android (`store.web.ts` is the web stub). The SDK is loaded lazily and only
 * when `purchasesSupported` (key set, not Expo Go), so Expo Go never touches it.
 * The app user is the family (`revenuecat_app_user_id` = `family-{id}` from the server), so a
 * purchase upgrades the whole family; the tier itself only changes through the server webhook.
 */

type PurchasesModule = typeof import('react-native-purchases');
type Purchases = PurchasesModule['default'];

let sdk: Promise<Purchases> | null = null;
/** The configured SDK once loaded (maps error codes). */
let loaded: Purchases | null = null;

function loadSdk(): Promise<Purchases> {
  if (!purchasesSupported || !REVENUECAT_API_KEY) {
    return Promise.reject(new StoreError('unavailable'));
  }
  const apiKey = REVENUECAT_API_KEY;
  sdk ??= import('react-native-purchases')
    .then(({ default: Purchases }) => {
      if (__DEV__) void Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
      Purchases.configure({ apiKey });
      loaded = Purchases;
      return Purchases;
    })
    .catch((error: unknown) => {
      sdk = null;
      throw toStoreError(error);
    });
  return sdk;
}

/** Packages of the last offering fetch, so screens only pass identifiers around. */
const packages = new Map<string, PurchasesPackage>();

function errorKind(Purchases: Purchases | null, code: unknown): StoreErrorKind {
  if (!Purchases) return 'unknown';
  const C = Purchases.PURCHASES_ERROR_CODE;
  switch (code) {
    case C.NETWORK_ERROR:
    case C.OFFLINE_CONNECTION_ERROR:
    case C.PRODUCT_REQUEST_TIMED_OUT_ERROR:
      return 'network';
    case C.PURCHASE_NOT_ALLOWED_ERROR:
    case C.INSUFFICIENT_PERMISSIONS_ERROR:
      return 'notAllowed';
    case C.PAYMENT_PENDING_ERROR:
      return 'pending';
    case C.PRODUCT_ALREADY_PURCHASED_ERROR:
    case C.RECEIPT_ALREADY_IN_USE_ERROR:
    case C.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
      return 'alreadyOwned';
    case C.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case C.CONFIGURATION_ERROR:
    case C.INVALID_CREDENTIALS_ERROR:
    case C.UNSUPPORTED_ERROR:
      return 'unavailable';
    case C.STORE_PROBLEM_ERROR:
    case C.PURCHASE_INVALID_ERROR:
    case C.INVALID_RECEIPT_ERROR:
    case C.MISSING_RECEIPT_FILE_ERROR:
      return 'store';
    default:
      return 'unknown';
  }
}

function toStoreError(error: unknown): StoreError {
  if (error instanceof StoreError) return error;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code: unknown }).code
      : undefined;
  const message = error instanceof Error ? error.message : undefined;
  return new StoreError(errorKind(loaded, code), message);
}

function isCancelled(Purchases: Purchases, error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: unknown; userCancelled?: unknown };
  return (
    e.userCancelled === true || e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

function hasFamily(info: CustomerInfo): boolean {
  return info.entitlements.active[FAMILY_ENTITLEMENT]?.isActive === true;
}

async function identify(appUserId: string): Promise<void> {
  const Purchases = await loadSdk();
  try {
    if ((await Purchases.getAppUserID()) !== appUserId) await Purchases.logIn(appUserId);
  } catch (error) {
    throw toStoreError(error);
  }
}

/**
 * Products whose intro offer / trial this store account can no longer get (iOS check; Google
 * only returns offers the account is eligible for, so Android reports nothing here).
 */
async function ineligibleProducts(
  Purchases: Purchases,
  productIds: string[],
): Promise<Set<string>> {
  if (Platform.OS !== 'ios' || productIds.length === 0) return new Set();
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    const ineligible = Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE;
    return new Set(productIds.filter((id) => result[id]?.status === ineligible));
  } catch {
    return new Set();
  }
}

export const store: StoreApi = {
  available: purchasesSupported,

  identify,

  async getPackages(appUserId) {
    await identify(appUserId);
    const Purchases = await loadSdk();
    try {
      const offerings = await Purchases.getOfferings();
      const available = offerings.current?.availablePackages ?? [];
      packages.clear();
      for (const pkg of available) packages.set(pkg.identifier, pkg);
      const ineligible = await ineligibleProducts(
        Purchases,
        available.filter((pkg) => pkg.product.introPrice).map((pkg) => pkg.product.identifier),
      );
      return toPaywallPackages(
        available.map((pkg) => ({
          identifier: pkg.identifier,
          packageType: String(pkg.packageType),
          product: pkg.product,
        })),
        (productId) => !ineligible.has(productId),
      );
    } catch (error) {
      throw toStoreError(error);
    }
  },

  async purchase(packageId) {
    const Purchases = await loadSdk();
    const pkg = packages.get(packageId);
    if (!pkg) throw new StoreError('unavailable');
    try {
      await Purchases.purchasePackage(pkg);
      return 'purchased';
    } catch (error) {
      if (isCancelled(Purchases, error)) return 'cancelled';
      throw toStoreError(error);
    }
  },

  async restore(appUserId) {
    await identify(appUserId);
    const Purchases = await loadSdk();
    try {
      return hasFamily(await Purchases.restorePurchases());
    } catch (error) {
      throw toStoreError(error);
    }
  },

  async reset() {
    // Only when the SDK was started in this app run; never loads it just to log out.
    if (!sdk) return;
    try {
      const Purchases = await sdk;
      if (!(await Purchases.isAnonymous())) await Purchases.logOut();
    } catch {
      // Best effort: the next admin's `identify` switches the user anyway.
    }
  },

  async getStorefront() {
    try {
      const Purchases = await loadSdk();
      return toAlpha3((await Purchases.getStorefront())?.countryCode);
    } catch {
      // Unknown storefront: the app treats the web link as not allowed.
      return null;
    }
  },

  offerCodeRedemption: !purchasesSupported ? null : Platform.OS === 'ios' ? 'sheet' : 'link',

  async presentCodeRedemptionSheet() {
    const Purchases = await loadSdk();
    try {
      await Purchases.presentCodeRedemptionSheet();
    } catch (error) {
      throw toStoreError(error);
    }
  },
};
