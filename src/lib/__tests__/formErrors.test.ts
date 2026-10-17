import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import { formErrors } from '@/lib/formErrors';

/** Fake `t`: returns the key, so tests see which string was chosen. */
const t = ((key: string) => key) as unknown as TFunction;

const termsMessage = 'Please accept the terms of service and the privacy policy.';
const validation = (fieldErrors: Record<string, string[]>) =>
  new ApiError(422, 'The given data was invalid.', 'validation_failed', undefined, fieldErrors);

/** Field lists of the screens that send `accept_terms` (JoinScreen, social BirthStep). */
const JOIN_FIELDS = ['code', 'email', 'password', 'accept_terms'] as const;
const BIRTH_FIELDS = ['birth_year', 'birth_month', 'accept_terms'] as const;

describe('formErrors', () => {
  it.each([
    ['join with email', JOIN_FIELDS],
    ['social birth step', BIRTH_FIELDS],
  ])(
    'shows a 422 on accept_terms under the checkbox on %s, not as a general error',
    (_, fields) => {
      const errors = formErrors(validation({ accept_terms: [termsMessage] }), t, fields);
      expect(errors.field('accept_terms')).toBe(termsMessage);
      expect(errors.general).toBeUndefined();
    },
  );

  it('falls back to a general message when the 422 field is not on the form', () => {
    const errors = formErrors(validation({ display_name: ['Required.'] }), t, BIRTH_FIELDS);
    expect(errors.field('accept_terms')).toBeUndefined();
    expect(errors.general).toBeDefined();
  });

  it('has no messages without an error', () => {
    const errors = formErrors(null, t, JOIN_FIELDS);
    expect(errors.field('accept_terms')).toBeUndefined();
    expect(errors.general).toBeUndefined();
  });

  it('keeps contract errors other than validation as a general message', () => {
    const errors = formErrors(
      new ApiError(422, 'Invite invalid', 'invite_invalid'),
      t,
      JOIN_FIELDS,
    );
    expect(errors.general).toBe('errors.inviteInvalid');
  });
});
