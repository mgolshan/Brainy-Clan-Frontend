import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import type { Policy } from '@/api/types';
import {
  adultInviteBlocked,
  adultLimitMessage,
  adultSeatsUsed,
  canBeAdmin,
  inviteErrorMessage,
  isAdultBand,
  maxAdults,
  roleErrorMessage,
} from '@/features/family/adults';
import en from '@/i18n/locales/en.json';

/** Fake `t`: returns the key and its options, so tests see which string was chosen. */
const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as unknown as TFunction;

const err = (status: number, code: string, fieldErrors: Record<string, string[]> = {}) =>
  new ApiError(status, 'Server says no', code, undefined, fieldErrors);

const limits = (max_adults?: number | null) =>
  ({
    limits: { max_members: 30, max_categories: 99, max_active_goals: null, max_adults },
  }) as Pick<Policy, 'limits'>;

const member = (age_band: string, status = 'active') => ({ age_band, status });
const invite = (age_band: string) => ({ age_band });

describe('adult bands', () => {
  it('counts adult and senior as adults (bands with purchases_allowed)', () => {
    expect(isAdultBand('adult')).toBe(true);
    expect(isAdultBand('senior')).toBe(true);
    expect(isAdultBand('teen')).toBe(false);
    expect(isAdultBand('child')).toBe(false);
    expect(isAdultBand(null)).toBe(false);
    expect(isAdultBand(undefined)).toBe(false);
  });

  it('lets only non-child, non-teen members become admins (unknown bands go to the server)', () => {
    expect(canBeAdmin({ age_band: 'adult' })).toBe(true);
    expect(canBeAdmin({ age_band: 'senior' })).toBe(true);
    expect(canBeAdmin({ age_band: 'child' })).toBe(false);
    expect(canBeAdmin({ age_band: 'teen' })).toBe(false);
    expect(canBeAdmin({ age_band: 'something_new' })).toBe(true);
  });
});

describe('maxAdults', () => {
  it('reads a number, and treats null or a missing field as unlimited', () => {
    expect(maxAdults(limits(2))).toBe(2);
    expect(maxAdults(limits(null))).toBeNull();
    expect(maxAdults(limits(undefined))).toBeNull();
    expect(maxAdults(null)).toBeNull();
    expect(maxAdults(undefined)).toBeNull();
  });
});

describe('adult seats', () => {
  it('counts active adult members plus pending adult invites', () => {
    expect(
      adultSeatsUsed(
        [member('adult'), member('senior'), member('child'), member('adult', 'removed')],
        [invite('adult'), invite('teen')],
      ),
    ).toBe(3);
  });

  const full = { members: [member('adult')], invites: [invite('senior')] };

  it('blocks an adult invite when the seats are full', () => {
    expect(adultInviteBlocked({ band: 'adult', max: 2, ...full })).toBe(true);
    expect(adultInviteBlocked({ band: 'senior', max: 1, ...full })).toBe(true);
  });

  it('never blocks a child or teen invite, or an unlimited plan', () => {
    expect(adultInviteBlocked({ band: 'child', max: 2, ...full })).toBe(false);
    expect(adultInviteBlocked({ band: 'teen', max: 2, ...full })).toBe(false);
    expect(adultInviteBlocked({ band: 'adult', max: null, ...full })).toBe(false);
  });

  it('leaves it to the server while anything is unknown', () => {
    expect(adultInviteBlocked({ band: null, max: 2, ...full })).toBe(false);
    expect(adultInviteBlocked({ band: 'adult', max: 2, members: undefined, invites: [] })).toBe(
      false,
    );
    expect(adultInviteBlocked({ band: 'adult', max: 2, members: [], invites: undefined })).toBe(
      false,
    );
  });

  it('allows an adult invite while a seat is free', () => {
    expect(adultInviteBlocked({ band: 'adult', max: 3, ...full })).toBe(false);
  });
});

describe('adultLimitMessage', () => {
  it('names the seat count, with teacher / student wording in a Classroom', () => {
    expect(adultLimitMessage(t, 'classroom', 2)).toBe('invite.adultLimitClassroom {"max":2}');
    expect(adultLimitMessage(t, 'family', 3)).toBe('invite.adultLimit {"count":3}');
  });

  it('falls back to the generic text without a number', () => {
    expect(adultLimitMessage(t, 'classroom', null)).toBe('errors.adultLimitReached');
  });

  it('uses strings that exist in en.json', () => {
    expect(en.invite.adultLimitClassroom).toContain('{{max}}');
    expect(en.invite.adultLimit_one).toContain('{{count}}');
    expect(en.invite.adultLimit_other).toContain('{{count}}');
    expect(en.errors.adultLimitReached).toBeTruthy();
    expect(en.member.adminAdultsOnly).toBe('Only adults can be admins.');
  });
});

describe('inviteErrorMessage', () => {
  it('maps adult_limit_reached to the seat message', () => {
    expect(inviteErrorMessage(err(403, 'adult_limit_reached'), t, 'classroom', 2)).toBe(
      'invite.adultLimitClassroom {"max":2}',
    );
  });

  it('keeps the usual message for other errors', () => {
    expect(inviteErrorMessage(err(403, 'member_limit_reached'), t, 'classroom', 2)).toBe(
      'errors.memberLimitReached',
    );
  });
});

describe('roleErrorMessage', () => {
  it('turns a 422 on role into "Only adults can be admins."', () => {
    const error = err(422, 'validation_failed', { role: ['The role is invalid.'] });
    expect(roleErrorMessage(error, t)).toBe('member.adminAdultsOnly');
  });

  it('keeps other errors as they are', () => {
    const other = err(422, 'validation_failed', { nickname: ['Too long'] });
    expect(roleErrorMessage(other, t)).toBe('Too long');
    expect(roleErrorMessage(err(403, 'forbidden'), t)).toBe('errors.forbidden');
  });
});
