import type { Subscription, WebCheckoutAvailability } from '@/api/types';

/**
 * Where the family's current plan is managed (F8): `web` for a Paddle plan bought on the website,
 * `store` for App Store / Google Play (via RevenueCat), `none` without a running plan.
 * A family holds at most one plan from one source; the server is the source of truth.
 */
export type PlanSource = 'none' | 'store' | 'web';

/**
 * A plan that is running (active or in the grace period / past due), or any paid tier
 * (`family`, `big_clan`, `classroom` or a newer one: unknown tiers count as paid).
 */
export function hasRunningPlan(sub: Pick<Subscription, 'status' | 'tier'>): boolean {
  return sub.status === 'active' || sub.status === 'grace' || sub.tier !== 'free';
}

/**
 * Whether a running store plan can be changed (other tier / period) from this device: only in
 * the store it was bought in (App Store on iOS, Google Play on Android). Buying in the other
 * store would start a second subscription.
 */
export function canChangePlanHere(store: Subscription['store'], os: string): boolean {
  return (store === 'app_store' && os === 'ios') || (store === 'play_store' && os === 'android');
}

export function planSource(
  sub: Pick<Subscription, 'status' | 'tier' | 'store'> | null,
): PlanSource {
  if (!sub || !hasRunningPlan(sub)) return 'none';
  // App Store / Google Play (or an unknown source: the manage-link knows where to go).
  return sub.store === 'paddle' ? 'web' : 'store';
}

/**
 * The web checkout URL to show, only when the server allows an in-app link for this storefront
 * (`link_allowed`) and gives an https URL; otherwise null (the app then mentions no web prices).
 */
export function webCheckoutUrl(
  availability: WebCheckoutAvailability | null | undefined,
): string | null {
  if (!availability?.link_allowed || typeof availability.url !== 'string') return null;
  return /^https:\/\/\S+$/i.test(availability.url) ? availability.url : null;
}

/** Google Play's page for redeeming promo / offer codes (Android offer-code redemption). */
export const PLAY_REDEEM_URL = 'https://play.google.com/redeem';

/** Store subscription pages, used when the manage-link endpoint isn't deployed yet. */
export const STORE_MANAGE_URLS: Readonly<Record<string, string>> = {
  app_store: 'https://apps.apple.com/account/subscriptions',
  play_store: 'https://play.google.com/store/account/subscriptions',
};
