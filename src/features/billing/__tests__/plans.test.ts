import {
  PAID_TIERS,
  PLAN_CATALOG,
  RECOMMENDED_TIER,
  defaultTier,
  entitledTier,
  familyOwnerAge,
  isOwnerTooYoung,
  isPaidTier,
  isTooSmall,
  offeringForTier,
  planChangeKind,
  planMembers,
  planMinOwnerAge,
  planStudents,
  pricingTiers,
  tierRank,
} from '@/features/billing/plans';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import type { PricingTier } from '@/api/types';
import { tierLabel } from '@/lib/labels';

describe('plan catalog (display only)', () => {
  it('mirrors the backend tier settings, cheapest first', () => {
    expect(PLAN_CATALOG.map((p) => p.tier)).toEqual(['family', 'big_clan', 'classroom']);
    expect(PLAN_CATALOG.map((p) => p.members)).toEqual([6, 12, 37]);
    expect(PLAN_CATALOG.map((p) => p.tier)).toEqual([...PAID_TIERS]);
    expect(RECOMMENDED_TIER).toBe('family');
  });

  it('gives Classroom 2 adults + 35 students', () => {
    const classroom = PLAN_CATALOG.find((p) => p.tier === 'classroom')!;
    expect(classroom.adults).toBe(2);
    expect(planStudents(classroom)).toBe(35);
    expect(planStudents({ members: 6, adults: null })).toBeNull();
  });

  it("prefers the server's limit for the family's current tier", () => {
    expect(planMembers('family', { tier: 'family', maxMembers: 7 })).toBe(7);
    expect(planMembers('big_clan', { tier: 'family', maxMembers: 7 })).toBe(12);
    expect(planMembers('classroom', null)).toBe(37);
  });
});

describe('tiers', () => {
  it('ranks free < family < big_clan < classroom; unknown is -1', () => {
    expect(tierRank('free')).toBe(0);
    expect(tierRank('family')).toBe(1);
    expect(tierRank('big_clan')).toBe(2);
    expect(tierRank('classroom')).toBe(3);
    expect(tierRank('school')).toBe(-1);
    expect(tierRank(null)).toBe(-1);
  });

  it('knows the paid tiers', () => {
    expect(isPaidTier('family')).toBe(true);
    expect(isPaidTier('big_clan')).toBe(true);
    expect(isPaidTier('classroom')).toBe(true);
    expect(isPaidTier('free')).toBe(false);
    expect(isPaidTier('school')).toBe(false);
  });

  it('labels every tier in en and fr, unknown tiers as their code', () => {
    const tEn = ((key: string) =>
      key.split('.').reduce<unknown>((o, k) => (o as never)[k], en)) as never;
    const tFr = ((key: string) =>
      key.split('.').reduce<unknown>((o, k) => (o as never)[k], fr)) as never;
    expect(['free', 'family', 'big_clan', 'classroom'].map((x) => tierLabel(tEn, x))).toEqual([
      'Free',
      'Family',
      'Big Clan',
      'Classroom',
    ]);
    expect(['free', 'family', 'big_clan', 'classroom'].map((x) => tierLabel(tFr, x))).toEqual([
      'Gratuit',
      'Famille',
      'Grand Clan',
      'Classe',
    ]);
    expect(tierLabel(tEn, 'school')).toBe('school');
  });
});

describe('entitledTier (RevenueCat entitlements → tier)', () => {
  it('picks the highest-ranked active entitlement', () => {
    expect(entitledTier(['family'])).toBe('family');
    expect(entitledTier(['family', 'big_clan'])).toBe('big_clan');
    expect(entitledTier(['classroom', 'family', 'big_clan'])).toBe('classroom');
    expect(entitledTier(new Set(['big_clan', 'family']))).toBe('big_clan');
  });

  it('ignores other entitlements; null without a plan entitlement', () => {
    expect(entitledTier([])).toBeNull();
    expect(entitledTier(['pro', 'free'])).toBeNull();
    expect(entitledTier(['pro', 'family'])).toBe('family');
  });
});

describe('isTooSmall / defaultTier', () => {
  it('is too small only when the family has more members than the plan allows', () => {
    expect(isTooSmall(6, 5)).toBe(false);
    expect(isTooSmall(6, 6)).toBe(false);
    expect(isTooSmall(6, 7)).toBe(true);
    expect(isTooSmall(12, 13)).toBe(true);
  });

  it('recommends Family to a new family that fits', () => {
    expect(defaultTier('free', 0)).toBe('family');
    expect(defaultTier('free', 2)).toBe('family');
    expect(defaultTier('free', 6)).toBe('family');
  });

  it('skips plans that are too small', () => {
    expect(defaultTier('free', 7)).toBe('big_clan');
    expect(defaultTier('free', 13)).toBe('classroom');
    expect(defaultTier('free', 50)).toBe('classroom');
  });

  it("keeps the family's current paid tier", () => {
    expect(defaultTier('big_clan', 3)).toBe('big_clan');
    expect(defaultTier('family', 9)).toBe('family');
    // Unknown tiers can't be shown in the picker: fall back to the size rule.
    expect(defaultTier('school', 2)).toBe('family');
  });
});

describe('planChangeKind', () => {
  it('is new from free', () => {
    expect(planChangeKind('free', 'big_clan')).toBe('new');
  });

  it('compares ranks for upgrades and downgrades', () => {
    expect(planChangeKind('family', 'big_clan')).toBe('upgrade');
    expect(planChangeKind('family', 'classroom')).toBe('upgrade');
    expect(planChangeKind('classroom', 'family')).toBe('downgrade');
    expect(planChangeKind('big_clan', 'family')).toBe('downgrade');
  });

  it('is a period change on the same tier; unknown tiers like a downgrade', () => {
    expect(planChangeKind('family', 'family')).toBe('period');
    expect(planChangeKind('school', 'family')).toBe('downgrade');
  });
});

describe('offeringForTier', () => {
  const family = { id: 'family' };
  const bigClan = { id: 'big_clan' };
  const current = { id: 'default' };

  it('reads offerings.all[tier]', () => {
    expect(offeringForTier({ all: { family, big_clan: bigClan }, current }, 'big_clan')).toBe(
      bigClan,
    );
    expect(offeringForTier({ all: { family }, current }, 'family')).toBe(family);
  });

  it('falls back to the current offering for Family only', () => {
    expect(offeringForTier({ all: {}, current }, 'family')).toBe(current);
    expect(offeringForTier({ all: {}, current }, 'classroom')).toBeNull();
    expect(offeringForTier({ all: {}, current: null }, 'family')).toBeNull();
  });
});

describe('owner age (Classroom needs an owner aged 18+)', () => {
  const NOW = new Date(2026, 10, 20);
  const tier = (id: string, min?: number | null): PricingTier => ({
    id,
    members: 6,
    plans: [],
    ...(min === undefined ? {} : { min_owner_age: min }),
  });

  it('reads min_owner_age from pricing when served, else the catalog (18 for Classroom)', () => {
    expect(planMinOwnerAge('classroom')).toBe(18);
    expect(planMinOwnerAge('family')).toBeNull();
    expect(planMinOwnerAge('big_clan', null)).toBeNull();
    expect(planMinOwnerAge('classroom', [tier('classroom', 21)])).toBe(21);
    expect(planMinOwnerAge('classroom', [tier('classroom', null)])).toBeNull();
    // Older backend: the field is absent → catalog.
    expect(planMinOwnerAge('classroom', [tier('classroom')])).toBe(18);
    expect(planMinOwnerAge('classroom', [tier('family', 30)])).toBe(18);
    expect(planMinOwnerAge('big_clan', [tier('big_clan', 16)])).toBe(16);
  });

  it('reads tiers only from the B12 pricing shape', () => {
    expect(pricingTiers({ currency: 'USD', tiers: [tier('family', null)] })).toHaveLength(1);
    expect(pricingTiers({ currency: 'USD' })).toBeNull();
    expect(pricingTiers({ currency: 'USD', tiers: 'x' as never })).toBeNull();
    expect(pricingTiers(null)).toBeNull();
  });

  it('blocks only a known owner younger than the minimum', () => {
    expect(isOwnerTooYoung(18, 17)).toBe(true);
    expect(isOwnerTooYoung(18, 18)).toBe(false);
    expect(isOwnerTooYoung(18, null)).toBe(false);
    expect(isOwnerTooYoung(null, 10)).toBe(false);
  });

  it("uses the signed-in owner's birth data, then the policy age", () => {
    const family = { owner_user_id: 1 };
    expect(
      familyOwnerAge(
        { user: { id: 1, birth_year: 2009, birth_month: 12 }, policyAge: 30 },
        family,
        [],
        NOW,
      ),
    ).toBe(16);
    expect(
      familyOwnerAge(
        { user: { id: 1, birth_year: null, birth_month: null }, policyAge: 30 },
        family,
        undefined,
        NOW,
      ),
    ).toBe(30);
  });

  it("uses the owner's member row when another admin is buying", () => {
    const me = { user: { id: 2, birth_year: 1980, birth_month: 1 }, policyAge: 46 };
    const members = [
      { user_id: 2, birth_year: 1980, birth_month: 1 },
      { user_id: 1, birth_year: 2009, birth_month: 6 },
    ];
    expect(familyOwnerAge(me, { owner_user_id: 1 }, members, NOW)).toBe(17);
    expect(familyOwnerAge(me, { owner_user_id: 1 }, undefined, NOW)).toBeNull();
    expect(familyOwnerAge(me, { owner_user_id: 9 }, members, NOW)).toBeNull();
    expect(familyOwnerAge(me, null, members, NOW)).toBeNull();
  });

  it('skips blocked tiers in the default choice', () => {
    expect(defaultTier('free', 13, ['classroom'])).toBe('big_clan');
    expect(defaultTier('free', 2, ['classroom'])).toBe('family');
    expect(defaultTier('free', 7, ['classroom'])).toBe('big_clan');
    // The current tier is kept (another billing period stays possible).
    expect(defaultTier('classroom', 20, ['classroom'])).toBe('classroom');
  });

  it('has the short reason in every locale', () => {
    expect(en.billing.plans.ownerTooYoung).toContain('{{age}}');
    expect(fr.billing.plans.ownerTooYoung).toContain('{{age}}');
  });
});
