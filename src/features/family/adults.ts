import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import type { AgeBand, FamilyTier, Invite, Member, Policy } from '@/api/types';
import { errorMessage } from '@/lib/errorMessage';

/**
 * Adult seats and admin roles (B12 step 3, every tier), pure logic.
 *
 * The contract defines an adult as a member whose age band has `purchases_allowed` (the `adult`
 * and `senior` bands). Members and invites only carry the band code, so the app reads the two
 * contract band codes; it never computes a band from an age. The server always has the last
 * word (403 `adult_limit_reached`, 422 on `role`): these helpers only explain it up front.
 */

/** Band codes the contract calls adults (bands with `purchases_allowed`). */
const ADULT_BANDS: readonly string[] = ['adult', 'senior'];
/** Band codes the contract calls children / teens (never admins). */
const MINOR_BANDS: readonly string[] = ['child', 'teen'];

export function isAdultBand(band: AgeBand | null | undefined): boolean {
  return !!band && ADULT_BANDS.includes(band);
}

/**
 * May this member be made admin? Child and teen: no. An unknown future band is left to the
 * server (it answers 422 on `role` if not).
 */
export function canBeAdmin(member: Pick<Member, 'age_band'>): boolean {
  return !MINOR_BANDS.includes(member.age_band);
}

/** `policy.limits.max_adults`: a number, or `null` for unlimited (also when not served). */
export function maxAdults(policy: Pick<Policy, 'limits'> | null | undefined): number | null {
  const max = policy?.limits.max_adults;
  return typeof max === 'number' ? max : null;
}

/** Seats taken the way the server counts them: active adult members plus pending adult invites. */
export function adultSeatsUsed(
  members: readonly Pick<Member, 'age_band' | 'status'>[],
  invites: readonly Pick<Invite, 'age_band'>[],
): number {
  return (
    members.filter((m) => m.status === 'active' && isAdultBand(m.age_band)).length +
    invites.filter((i) => isAdultBand(i.age_band)).length
  );
}

/**
 * The invite form knows in advance that an adult invite would get 403 `adult_limit_reached`.
 * `false` while anything is unknown (band not previewed yet, members or invites not loaded,
 * unlimited): the server then decides.
 */
export function adultInviteBlocked(args: {
  band: AgeBand | null | undefined;
  max: number | null;
  members: readonly Pick<Member, 'age_band' | 'status'>[] | undefined;
  invites: readonly Pick<Invite, 'age_band'>[] | undefined;
}): boolean {
  const { band, max, members, invites } = args;
  if (max === null || !isAdultBand(band) || !members || !invites) return false;
  return adultSeatsUsed(members, invites) >= max;
}

/** "This plan has room for N adults…" (teacher / student wording in a Classroom). */
export function adultLimitMessage(
  t: TFunction,
  tier: FamilyTier | null | undefined,
  max: number | null,
): string {
  if (max === null) return t('errors.adultLimitReached');
  return tier === 'classroom'
    ? t('invite.adultLimitClassroom', { max })
    : t('invite.adultLimit', { count: max });
}

/** Message for a failed invite: `adult_limit_reached` names the seat count when it is known. */
export function inviteErrorMessage(
  error: unknown,
  t: TFunction,
  tier: FamilyTier | null | undefined,
  max: number | null,
): string {
  if (error instanceof ApiError && error.code === 'adult_limit_reached') {
    return adultLimitMessage(t, tier, max);
  }
  return errorMessage(error, t);
}

/** Message for a failed role change: a 422 on `role` says "Only adults can be admins." */
export function roleErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.status === 422 && error.fieldError('role')) {
    return t('member.adminAdultsOnly');
  }
  return errorMessage(error, t);
}
