import {
  canSubmitForgot,
  forgotLocale,
  forgotPasswordBody,
  handOffForgotEmail,
  isPlausibleEmail,
  takeForgotEmail,
} from '@/features/auth/forgotPassword';

describe('forgot password form', () => {
  it('accepts plausible emails only', () => {
    expect(isPlausibleEmail('mom@brainyclan.test')).toBe(true);
    expect(isPlausibleEmail('  mom@brainyclan.test ')).toBe(true);
    expect(isPlausibleEmail('')).toBe(false);
    expect(isPlausibleEmail('mom')).toBe(false);
    expect(isPlausibleEmail('mom@home')).toBe(false);
    expect(isPlausibleEmail('m om@home.ca')).toBe(false);
  });

  it('sends the trimmed email and the app locale', () => {
    expect(forgotPasswordBody(' mom@brainyclan.test ', 'fr')).toEqual({
      email: 'mom@brainyclan.test',
      locale: 'fr',
    });
    expect(forgotPasswordBody('a@b.co', 'fr-CA').locale).toBe('fr');
    expect(forgotPasswordBody('a@b.co', 'en-US').locale).toBe('en');
  });

  it('maps any other language to English', () => {
    expect(forgotLocale('de')).toBe('en');
    expect(forgotLocale(undefined)).toBe('en');
  });

  it('can submit only with an email, nothing pending and no running lock', () => {
    expect(canSubmitForgot('a@b.co', false, false)).toBe(true);
    expect(canSubmitForgot('a@b.co', true, false)).toBe(false);
    expect(canSubmitForgot('a@b.co', false, true)).toBe(false);
    expect(canSubmitForgot('nope', false, false)).toBe(false);
  });

  it('prefills from the login screen in memory, overwritten on every hand-off', () => {
    expect(takeForgotEmail()).toBe('');
    handOffForgotEmail(' mom@brainyclan.test ');
    expect(takeForgotEmail()).toBe('mom@brainyclan.test');
    expect(takeForgotEmail()).toBe('mom@brainyclan.test');
    handOffForgotEmail('');
    expect(takeForgotEmail()).toBe('');
  });
});
