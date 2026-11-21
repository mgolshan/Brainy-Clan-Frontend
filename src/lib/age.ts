import { ApiError } from '@/api/client';

/**
 * Owner age rule (product rule; the server is the referee and answers 403 `owner_too_young`
 * with `min_age`): self sign-up and creating a family or a class (any plan) need 18+. Kids and
 * teens join with an invite code. The app only uses this to explain *before* the user tries
 * (a Classroom plan's `GET /pricing` `min_owner_age` wins when served; see
 * `src/features/billing/plans.ts`).
 */
export const MIN_FAMILY_OWNER_AGE = 18;

/**
 * Age in whole years from birth year + month, the same way the backend computes it
 * (`PolicyResolver::age`): current year minus birth year, one less while the birth month hasn't
 * come yet this year (an unknown month counts as January). `null` without a birth year.
 */
export function ageFromBirth(
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (birthYear === null || birthYear === undefined || !Number.isFinite(birthYear)) return null;
  let age = now.getFullYear() - birthYear;
  if (now.getMonth() + 1 < (birthMonth ?? 1)) age--;
  return Math.max(0, age);
}

/** Younger than `minAge`. An unknown age is never "too young" (the server decides then). */
export function isUnderAge(age: number | null | undefined, minAge: number): boolean {
  return age !== null && age !== undefined && age < minAge;
}

/** Age from birth data when known, else a server-given age (policy `age`), else null. */
export function knownAge(
  birth: { birth_year?: number | null; birth_month?: number | null } | null | undefined,
  fallbackAge?: number | null,
  now?: Date,
): number | null {
  return ageFromBirth(birth?.birth_year, birth?.birth_month, now) ?? fallbackAge ?? null;
}

/** `min_age` of a 403 `owner_too_young` body; null for any other error or a missing number. */
export function ownerTooYoungMinAge(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== 'owner_too_young') return null;
  const body = error.body;
  if (typeof body !== 'object' || body === null || !('min_age' in body)) return null;
  const minAge = (body as { min_age: unknown }).min_age;
  return typeof minAge === 'number' && Number.isFinite(minAge) ? minAge : null;
}

/**
 * Create-family gate: the minimum age the user misses, or null when they may try. A server
 * `owner_too_young` answer wins (its `min_age`); otherwise the signed-in user's birth data
 * (then policy `age`) is checked against 18. Unknown age → null (the server decides).
 */
export function createFamilyMinAgeMissed(
  user: { birth_year?: number | null; birth_month?: number | null } | null | undefined,
  policyAge: number | null | undefined,
  error: unknown,
  now?: Date,
): number | null {
  if (error instanceof ApiError && error.code === 'owner_too_young') {
    return ownerTooYoungMinAge(error) ?? MIN_FAMILY_OWNER_AGE;
  }
  return isUnderAge(knownAge(user, policyAge, now), MIN_FAMILY_OWNER_AGE)
    ? MIN_FAMILY_OWNER_AGE
    : null;
}
