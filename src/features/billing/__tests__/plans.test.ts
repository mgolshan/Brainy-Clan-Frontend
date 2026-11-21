import {
  PAID_TIERS,
  PLAN_CATALOG,
  RECOMMENDED_TIER,
  defaultTier,
  entitledTier,
  isPaidTier,
  isTooSmall,
  offeringForTier,
  planChangeKind,
  planMembers,
  planStudents,
  tierRank,
} from '@/features/billing/plans';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
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
