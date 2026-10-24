import type { StoreApi } from '@/features/billing/storeTypes';
import { StoreError } from '@/features/billing/storeTypes';

/**
 * Web: no in-app purchases (store billing needs the iOS/Android app; RevenueCat Web Billing is a
 * later milestone), so the paywall entry is hidden and these are never called.
 */
const unavailable = () => Promise.reject(new StoreError('unavailable'));

export const store: StoreApi = {
  available: false,
  identify: unavailable,
  getPackages: unavailable,
  purchase: unavailable,
  restore: unavailable,
  reset: () => Promise.resolve(),
  getStorefront: () => Promise.resolve(null),
  offerCodeRedemption: null,
  presentCodeRedemptionSheet: unavailable,
};
