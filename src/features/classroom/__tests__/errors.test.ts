import type { TFunction } from 'i18next';
import { router } from 'expo-router';

import { ApiError } from '@/api/client';
import {
  codesErrorMessage,
  consentErrorMessage,
  isConsentRequired,
  newYearErrorMessage,
  retryMinutes,
} from '@/features/classroom/errors';
import { routeToConsentIfRequired } from '@/features/classroom/hooks';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as unknown as TFunction;

const err = (
  status: number,
  code: string,
  fieldErrors: Record<string, string[]> = {},
  retryAfter: number | null = null,
) => new ApiError(status, 'Server says no', code, undefined, fieldErrors, retryAfter);

describe('consent errors', () => {
  it('recognises 409 classroom_consent_required only', () => {
    expect(isConsentRequired(err(409, 'classroom_consent_required'))).toBe(true);
    expect(isConsentRequired(err(409, 'no_family'))).toBe(false);
    expect(isConsentRequired(new Error('x'))).toBe(false);
  });

  it('opens the consent screen once for a burst of 409s', () => {
    const push = router.push as jest.Mock;
    push.mockClear();
    const invalidate = jest.fn(() => Promise.resolve());
    const client = { invalidateQueries: invalidate } as never;
    expect(routeToConsentIfRequired(err(409, 'classroom_consent_required'), client)).toBe(true);
    expect(routeToConsentIfRequired(err(409, 'classroom_consent_required'), client)).toBe(true);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/classroom/consent');
    // The family / me caches are re-read (their consent state is stale).
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['family'], exact: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'], exact: true });
  });

  it('leaves other errors alone', () => {
    const push = router.push as jest.Mock;
    push.mockClear();
    expect(routeToConsentIfRequired(err(403, 'plan_required'))).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('a 422 on consent means the statement changed', () => {
    expect(consentErrorMessage(err(422, 'validation_failed', { version: ['x'] }), t)).toBe(
      'classroom.consent.stale',
    );
    expect(consentErrorMessage(err(403, 'plan_required'), t)).toBe('errors.planRequired');
  });
});

describe('codesErrorMessage', () => {
  it('explains the hourly limit, with minutes when Retry-After is sent', () => {
    expect(codesErrorMessage(err(429, 'rate_limited'), t)).toBe('classroom.codes.rateLimited');
    expect(codesErrorMessage(err(429, 'rate_limited', {}, 125), t)).toBe(
      'classroom.codes.rateLimitedIn {"count":3}',
    );
    expect(codesErrorMessage(err(403, 'forbidden'), t)).toBe('errors.forbidden');
  });

  it('rounds the wait up to whole minutes', () => {
    expect(retryMinutes(err(429, 'rate_limited', {}, 1))).toBe(1);
    expect(retryMinutes(err(429, 'rate_limited', {}, 60))).toBe(1);
    expect(retryMinutes(err(429, 'rate_limited', {}, 0))).toBeNull();
    expect(retryMinutes(new Error('x'))).toBeNull();
  });
});

describe('newYearErrorMessage', () => {
  it('a 422 on confirm_name says the name does not match', () => {
    expect(newYearErrorMessage(err(422, 'validation_failed', { confirm_name: ['x'] }), t)).toBe(
      'classroom.newYear.nameMismatch',
    );
    expect(newYearErrorMessage(err(422, 'validation_failed', { clear: ['Pick one'] }), t)).toBe(
      'Pick one',
    );
    expect(newYearErrorMessage(err(409, 'classroom_consent_required'), t)).toBe(
      'errors.classroomConsentRequired',
    );
  });
});
