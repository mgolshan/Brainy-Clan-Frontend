import type { FamilyTier } from '@/api/types';

/**
 * Plan tiers (backend PLAN B12, API.md "Plans and tiers"): Free, Family, Big Clan, Classroom.
 *
 * DISPLAY ONLY. The server sends the app the limits of the family's *current* tier (policy
 * `limits`), never those of the other tiers, so the paywall's plan picker reads the member sizes
 * of the other plans from the small static catalog below. It must mirror the backend tier
 * settings table; the server stays the referee (it enforces every limit, and the tier only
 * changes through store / Paddle webhooks). Prices never live here: the paywall shows the store
 * prices of each tier's RevenueCat offering.
 */

export const PAID_TIERS = ['family', 'big_clan', 'classroom'] as const;
export type PaidTier = (typeof PAID_TIERS)[number];

export interface PlanInfo {
  tier: PaidTier;
  /** `limits.max_members` of the tier. */
  members: number;
  /** Adult seats when the tier caps adults (Classroom: teacher + co-teacher), else null. */
  adults: number | null;
}

/** The plan catalog, cheapest first (= rank order `family` < `big_clan` < `classroom`). */
export const PLAN_CATALOG: readonly PlanInfo[] = [
  { tier: 'family', members: 6, adults: null },
  { tier: 'big_clan', members: 12, adults: null },
  { tier: 'classroom', members: 37, adults: 2 },
];

/** The plan the picker suggests to a family without a paid plan. */
export const RECOMMENDED_TIER: PaidTier = 'family';

export function isPaidTier(tier: unknown): tier is PaidTier {
  return PAID_TIERS.some((t) => t === tier);
}

/** Rank of a tier: free 0, family 1, big_clan 2, classroom 3; unknown values -1. */
export function tierRank(tier: FamilyTier | null | undefined): number {
  if (tier === 'free') return 0;
  const index = PAID_TIERS.findIndex((t) => t === tier);
  return index >= 0 ? index + 1 : -1;
}

export function planInfo(tier: PaidTier): PlanInfo {
  return PLAN_CATALOG.find((p) => p.tier === tier) ?? PLAN_CATALOG[0];
}

/**
 * Member limit of a tier: the server's policy limit when it is the family's current tier (the
 * real number), else the display catalog.
 */
export function planMembers(
  tier: PaidTier,
  current: { tier: FamilyTier; maxMembers: number } | null | undefined,
): number {
  return current && current.tier === tier ? current.maxMembers : planInfo(tier).members;
}

/** Students of a tier with an adult cap (members minus adult seats), else null. */
export function planStudents(plan: Pick<PlanInfo, 'members' | 'adults'>): number | null {
  return plan.adults === null ? null : Math.max(0, plan.members - plan.adults);
}

/** A plan is too small when the family already has more members than it allows. */
export function isTooSmall(members: number, memberCount: number): boolean {
  return memberCount > members;
}

/**
 * RevenueCat entitlements are named like the tiers (`family`, `big_clan`, `classroom`). With
 * several active ones, the family gets the highest-ranked tier (same rule as the server).
 * Null when none of the three is active.
 */
export function entitledTier(activeEntitlementIds: Iterable<string>): PaidTier | null {
  let best: PaidTier | null = null;
  for (const id of activeEntitlementIds) {
    if (isPaidTier(id) && (best === null || tierRank(id) > tierRank(best))) best = id;
  }
  return best;
}

/**
 * The tier selected when the paywall opens: the family's current paid tier, else the
 * recommended one if big enough, else the smallest plan that fits (the biggest as last resort).
 */
export function defaultTier(currentTier: FamilyTier, memberCount: number): PaidTier {
  if (isPaidTier(currentTier)) return currentTier;
  const fits = (p: PlanInfo) => !isTooSmall(p.members, memberCount);
  const recommended = planInfo(RECOMMENDED_TIER);
  if (fits(recommended)) return recommended.tier;
  return (PLAN_CATALOG.find(fits) ?? PLAN_CATALOG[PLAN_CATALOG.length - 1]).tier;
}

/**
 * What buying `target` means for a family on `current`: a first paid plan (`new`), a bigger plan
 * (`upgrade`, the store switches at once), a smaller one (`downgrade`, the App Store switches at
 * the next renewal) or another billing period of the same plan (`period`). An unknown current
 * tier can't be compared and is handled like a downgrade (no promise of an instant switch).
 */
export type PlanChangeKind = 'new' | 'upgrade' | 'downgrade' | 'period';

export function planChangeKind(current: FamilyTier, target: PaidTier): PlanChangeKind {
  if (current === 'free') return 'new';
  if (current === target) return 'period';
  const rank = tierRank(current);
  if (rank < 0) return 'downgrade';
  return tierRank(target) > rank ? 'upgrade' : 'downgrade';
}

/**
 * The RevenueCat offering of a tier (offering identifier = tier). Older dashboards only have the
 * current offering, which is the Family one, so `family` falls back to it; other tiers don't.
 */
export function offeringForTier<T>(
  offerings: { all: Readonly<Record<string, T>>; current: T | null },
  tier: PaidTier,
): T | null {
  return offerings.all[tier] ?? (tier === 'family' ? offerings.current : null);
}
