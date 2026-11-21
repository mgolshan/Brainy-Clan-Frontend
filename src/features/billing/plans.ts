import type { Family, FamilyTier, Member, Pricing, PricingTier, User } from '@/api/types';
import { isUnderAge, knownAge } from '@/lib/age';

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
  /**
   * Minimum age of the family owner (Classroom: 18), else null. Fallback only: `GET /pricing`
   * tier `min_owner_age` wins when served; the server answers 403 `owner_too_young` anyway.
   */
  minOwnerAge: number | null;
}

/** The plan catalog, cheapest first (= rank order `family` < `big_clan` < `classroom`). */
export const PLAN_CATALOG: readonly PlanInfo[] = [
  { tier: 'family', members: 6, adults: null, minOwnerAge: null },
  { tier: 'big_clan', members: 12, adults: null, minOwnerAge: null },
  { tier: 'classroom', members: 37, adults: 2, minOwnerAge: 18 },
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

/** The `tiers[]` of a `GET /pricing` body; null for an older shape (no `tiers`) or junk. */
export function pricingTiers(pricing: Pricing | null | undefined): PricingTier[] | null {
  const tiers = pricing?.tiers;
  return Array.isArray(tiers) ? tiers : null;
}

/**
 * Minimum owner age of a tier: the `GET /pricing` tier's `min_owner_age` when that field is
 * served (null there = no minimum), else the display catalog.
 */
export function planMinOwnerAge(
  tier: PaidTier,
  pricingTiers?: readonly PricingTier[] | null,
): number | null {
  const served = pricingTiers?.find((p) => p.id === tier);
  if (served && served.min_owner_age !== undefined) return served.min_owner_age;
  return planInfo(tier).minOwnerAge;
}

/** The owner is known to be younger than the tier's minimum (unknown age → not blocked). */
export function isOwnerTooYoung(minOwnerAge: number | null, ownerAge: number | null): boolean {
  return minOwnerAge !== null && isUnderAge(ownerAge, minOwnerAge);
}

/**
 * Age of the family owner from data already loaded: the signed-in user's birth data (then the
 * server's policy `age`) when they own the family, else the owner's member row (admins see
 * birth data). Null when unknown.
 */
export function familyOwnerAge(
  me: { user: Pick<User, 'id' | 'birth_year' | 'birth_month'>; policyAge?: number | null },
  family: Pick<Family, 'owner_user_id'> | null | undefined,
  members: readonly Pick<Member, 'user_id' | 'birth_year' | 'birth_month'>[] | undefined,
  now?: Date,
): number | null {
  if (!family) return null;
  if (family.owner_user_id === me.user.id) return knownAge(me.user, me.policyAge, now);
  const owner = members?.find((m) => m.user_id === family.owner_user_id);
  return owner ? knownAge(owner, null, now) : null;
}

/**
 * The tier selected when the paywall opens: the family's current paid tier, else the
 * recommended one if big enough, else the smallest plan that fits (the biggest as last resort).
 * `blocked` tiers (owner too young) are skipped unless nothing else is left.
 */
export function defaultTier(
  currentTier: FamilyTier,
  memberCount: number,
  blocked: readonly PaidTier[] = [],
): PaidTier {
  if (isPaidTier(currentTier)) return currentTier;
  const open = (p: PlanInfo) => !blocked.includes(p.tier);
  const fits = (p: PlanInfo) => open(p) && !isTooSmall(p.members, memberCount);
  const recommended = planInfo(RECOMMENDED_TIER);
  if (fits(recommended)) return recommended.tier;
  const lastResort =
    [...PLAN_CATALOG].reverse().find(open) ?? PLAN_CATALOG[PLAN_CATALOG.length - 1];
  return (PLAN_CATALOG.find(fits) ?? lastResort).tier;
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

/**
 * The tier the paywall opens with when a screen asks for one (`/family-plan?plan=classroom`,
 * e.g. right after a teacher created their class). Null for a missing or unknown value; the
 * picker still skips a tier the owner is too young for.
 */
export function preselectedTier(param: unknown): PaidTier | null {
  const value = Array.isArray(param) ? param[0] : param;
  return isPaidTier(value) ? value : null;
}

/**
 * The Classroom minimum owner age the user is known to miss (teacher sign-up), else null. Unknown
 * age → null: the server decides (403 `owner_too_young` when buying Classroom).
 */
export function classroomAgeMissed(
  age: number | null,
  pricingTiers?: readonly PricingTier[] | null,
): number | null {
  const min = planMinOwnerAge('classroom', pricingTiers);
  return isOwnerTooYoung(min, age) ? min : null;
}
