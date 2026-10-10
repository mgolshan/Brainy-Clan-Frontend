import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/errorMessage';

/**
 * Splits a mutation error for a form: per-field messages from a 422, and a general message for
 * everything else (or a 422 whose fields aren't on this form).
 */
export function formErrors(error: unknown, t: TFunction, fields: readonly string[]) {
  const field = (name: string): string | undefined =>
    error instanceof ApiError ? error.fieldError(name) : undefined;

  let general: string | undefined;
  if (error) {
    const hasVisibleFieldError =
      error instanceof ApiError &&
      error.code === 'validation_failed' &&
      fields.some((f) => error.fieldError(f));
    general = hasVisibleFieldError ? undefined : errorMessage(error, t);
  }
  return { field, general };
}
