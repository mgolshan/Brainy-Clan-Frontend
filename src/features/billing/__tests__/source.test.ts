import type { Subscription } from '@/api/types';
import {
  canChangePlanHere,
  hasRunningPlan,
  planSource,
  webCheckoutUrl,
} from '@/features/billing/source';
import { toAlpha3 } from '@/lib/countryCodes';

const sub = (over: Partial<Subscription>): Subscription => ({
  tier: 'free',
  status: 'none',
  store: null,
  product_id: null,
  expires_at: null,
  will_renew: false,
  revenuecat_app_user_id: 'family-1',
  ...over,
});

describe('planSource', () => {
  it('is web for a running Paddle plan (purchase options hidden)', () => {
    expect(planSource(sub({ tier: 'family', status: 'active', store: 'paddle' }))).toBe('web');
    expect(planSource(sub({ tier: 'family', status: 'grace', store: 'paddle' }))).toBe('web');
  });

  it('is store for running App Store / Google Play plans', () => {
    expect(planSource(sub({ tier: 'family', status: 'active', store: 'app_store' }))).toBe('store');
    expect(planSource(sub({ tier: 'family', status: 'grace', store: 'play_store' }))).toBe('store');
    // Family tier from an unknown source still counts as a running plan.
    expect(planSource(sub({ tier: 'family', status: 'active', store: null }))).toBe('store');
  });

  it('is none without a running plan (expired plans can be bought again)', () => {
    expect(planSource(null)).toBe('none');
    expect(planSource(sub({}))).toBe('none');
    expect(planSource(sub({ status: 'expired', store: 'paddle' }))).toBe('none');
    expect(planSource(sub({ status: 'expired', store: 'app_store' }))).toBe('none');
  });
});

describe('hasRunningPlan (B12 tiers)', () => {
  it.each(['family', 'big_clan', 'classroom', 'some_future_tier'])(
    'counts the %s tier as a running plan, even without an active status',
    (tier) => {
      expect(hasRunningPlan(sub({ tier, status: 'none' }))).toBe(true);
      expect(hasRunningPlan(sub({ tier, status: 'expired' }))).toBe(true);
      expect(planSource(sub({ tier, status: 'active', store: 'paddle' }))).toBe('web');
      expect(planSource(sub({ tier, status: 'active', store: 'app_store' }))).toBe('store');
    },
  );

  it('is false for the free tier unless the status is still running', () => {
    expect(hasRunningPlan(sub({}))).toBe(false);
    expect(hasRunningPlan(sub({ status: 'expired' }))).toBe(false);
    expect(hasRunningPlan(sub({ status: 'active' }))).toBe(true);
    expect(hasRunningPlan(sub({ status: 'grace' }))).toBe(true);
  });
});

describe('canChangePlanHere', () => {
  it('only in the store the plan was bought in', () => {
    expect(canChangePlanHere('app_store', 'ios')).toBe(true);
    expect(canChangePlanHere('play_store', 'android')).toBe(true);
    expect(canChangePlanHere('app_store', 'android')).toBe(false);
    expect(canChangePlanHere('play_store', 'ios')).toBe(false);
    expect(canChangePlanHere('paddle', 'ios')).toBe(false);
    expect(canChangePlanHere(null, 'android')).toBe(false);
    expect(canChangePlanHere('app_store', 'web')).toBe(false);
  });
});

describe('webCheckoutUrl (availability gating)', () => {
  const url = 'https://brainyclan.com/subscribe?plan=annual&src=app';

  it('returns the server URL only when the link is allowed', () => {
    expect(webCheckoutUrl({ link_allowed: true, url })).toBe(url);
  });

  it('hides the link when not allowed, missing or not https', () => {
    expect(webCheckoutUrl({ link_allowed: false, url })).toBeNull();
    expect(webCheckoutUrl({ link_allowed: true, url: null })).toBeNull();
    expect(
      webCheckoutUrl({ link_allowed: true, url: 'http://brainyclan.com/subscribe' }),
    ).toBeNull();
    expect(webCheckoutUrl({ link_allowed: true, url: 'javascript:alert(1)' })).toBeNull();
    expect(webCheckoutUrl(null)).toBeNull();
    expect(webCheckoutUrl(undefined)).toBeNull();
  });
});

describe('toAlpha3 (storefront country)', () => {
  it('keeps StoreKit alpha-3 codes and maps Play alpha-2 codes', () => {
    expect(toAlpha3('USA')).toBe('USA');
    expect(toAlpha3('US')).toBe('USA');
    expect(toAlpha3('ca')).toBe('CAN');
    expect(toAlpha3('FR')).toBe('FRA');
    expect(toAlpha3('GB')).toBe('GBR');
  });

  it('is null for unknown or empty codes (the link is then not allowed)', () => {
    expect(toAlpha3('ZZ')).toBeNull();
    expect(toAlpha3('ZZZ')).toBeNull();
    expect(toAlpha3('')).toBeNull();
    expect(toAlpha3(null)).toBeNull();
    expect(toAlpha3(undefined)).toBeNull();
    expect(toAlpha3('UNITED')).toBeNull();
  });
});
