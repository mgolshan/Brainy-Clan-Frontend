import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/errorMessage';

/** Classroom error handling (B12 step 3), pure logic. */

/** 409 `classroom_consent_required`: a teacher must accept the consent statement first. */
export function isConsentRequired(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'classroom_consent_required';
}

/** 429 on a Classroom request (code cards: 10 per hour per family). */
export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 429 || error.code === 'rate_limited');
}

/** Whole minutes to wait from a 429's `retryAfter` (seconds), or null when not sent. */
export function retryMinutes(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.retryAfter === null || error.retryAfter <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(error.retryAfter / 60));
}

/** Message for a failed "make code cards" request. */
export function codesErrorMessage(error: unknown, t: TFunction): string {
  if (isRateLimited(error)) {
    const minutes = retryMinutes(error);
    return minutes !== null
      ? t('classroom.codes.rateLimitedIn', { count: minutes })
      : t('classroom.codes.rateLimited');
  }
  return errorMessage(error, t);
}

/** Message for a failed new-year request: a 422 on `confirm_name` says the name didn't match. */
export function newYearErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.status === 422 && error.fieldError('confirm_name')) {
    return t('classroom.newYear.nameMismatch');
  }
  return errorMessage(error, t);
}

/** Message for a failed consent: 422 means the statement changed while it was open. */
export function consentErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.status === 422) return t('classroom.consent.stale');
  return errorMessage(error, t);
}
