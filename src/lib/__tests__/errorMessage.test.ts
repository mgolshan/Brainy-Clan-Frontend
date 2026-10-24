import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import en from '@/i18n/locales/en.json';
import { errorMessage } from '@/lib/errorMessage';

/** Fake `t`: returns the key, so tests see which string was chosen. */
const t = ((key: string) => key) as unknown as TFunction;

const err = (
  status: number,
  code: string,
  fieldErrors: Record<string, string[]> = {},
  message = 'Server says no',
) => new ApiError(status, message, code, undefined, fieldErrors);

const hasKey = (path: string) =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en) !==
  undefined;

/** Contract codes (API.md "Error codes") the app shows with its own translated text. */
const MAPPED: [string, number, string][] = [
  ['unauthenticated', 401, 'errors.unauthenticated'],
  ['invalid_credentials', 401, 'errors.invalidCredentials'],
  ['forbidden', 403, 'errors.forbidden'],
  ['member_limit_reached', 403, 'errors.memberLimitReached'],
  ['category_not_allowed', 403, 'errors.categoryNotAllowed'],
  ['no_family', 409, 'errors.noFamily'],
  ['already_in_family', 409, 'errors.alreadyInFamily'],
  ['invite_invalid', 422, 'errors.inviteInvalid'],
  ['sign_in_code_invalid', 422, 'errors.signInCodeInvalid'],
  ['social_token_invalid', 401, 'errors.socialTokenInvalid'],
  ['social_signup_incomplete', 422, 'errors.socialSignupIncomplete'],
  ['social_account_taken', 409, 'errors.socialAccountTaken'],
  ['last_sign_in_method', 409, 'errors.lastSignInMethod'],
  ['family_owner_cannot_leave', 409, 'errors.familyOwnerCannotLeave'],
  ['session_not_active', 409, 'errors.sessionNotActive'],
  ['second_chance_unavailable', 403, 'errors.secondChanceUnavailable'],
  ['goal_limit_reached', 403, 'errors.goalLimitReached'],
  ['ad_reward_pending', 409, 'errors.adRewardPending'],
  ['app_update_required', 426, 'errors.updateRequired'],
  ['not_found', 404, 'errors.notFound'],
  ['rate_limited', 429, 'errors.rateLimited'],
  ['login_locked', 429, 'errors.loginLocked'],
  ['subscription_exists', 409, 'errors.subscriptionExists'],
  ['web_checkout_unavailable', 503, 'errors.webCheckoutUnavailable'],
  ['referral_code_invalid', 422, 'billing.referral.invalid'],
  ['referral_code_locked', 409, 'billing.referral.locked'],
  // Client-side codes (no HTTP answer).
  ['network_error', 0, 'errors.network'],
  ['timeout', 0, 'errors.timeout'],
];

describe('errorMessage', () => {
  it.each(MAPPED)('maps %s (%i) to %s', (code, status, key) => {
    expect(errorMessage(err(status, code), t)).toBe(key);
  });

  it.each(MAPPED)('the string for %s exists in en.json', (_code, _status, key) => {
    expect(hasKey(key)).toBe(true);
  });

  it('shows the first field message of a validation error (already localized by Laravel)', () => {
    const error = err(422, 'validation_failed', {
      email: ['The email has already been taken.', 'Second message'],
      nickname: ['Too long'],
    });
    expect(errorMessage(error, t)).toBe('The email has already been taken.');
  });

  it('falls back to the server message, then a generic text, for a validation error without fields', () => {
    expect(errorMessage(err(422, 'validation_failed', {}, 'The given data was invalid.'), t)).toBe(
      'The given data was invalid.',
    );
  });

  it('uses rate-limit and server texts for unmapped codes by status', () => {
    expect(errorMessage(err(429, 'unknown'), t)).toBe('errors.rateLimited');
    expect(errorMessage(err(500, 'unknown'), t)).toBe('errors.server');
    expect(errorMessage(err(503, 'unknown'), t)).toBe('errors.server');
  });

  it('shows the server message for other unmapped codes (e.g. item_already_answered)', () => {
    expect(errorMessage(err(409, 'item_already_answered', {}, 'Already answered.'), t)).toBe(
      'Already answered.',
    );
    expect(errorMessage(err(400, 'something_new', {}, ''), t)).toBe('errors.unknown');
  });

  it('uses the generic text for anything that is not an ApiError', () => {
    expect(errorMessage(new Error('boom'), t)).toBe('errors.unknown');
    expect(errorMessage('boom', t)).toBe('errors.unknown');
    expect(errorMessage(undefined, t)).toBe('errors.unknown');
  });
});

describe('ApiError', () => {
  it('is a network error only without an HTTP status', () => {
    expect(err(0, 'network_error').isNetworkError).toBe(true);
    expect(err(500, 'unknown').isNetworkError).toBe(false);
  });

  it('reads the first message of a field', () => {
    const error = err(422, 'validation_failed', { email: ['Taken', 'Other'] });
    expect(error.fieldError('email')).toBe('Taken');
    expect(error.fieldError('nickname')).toBeUndefined();
  });
});
