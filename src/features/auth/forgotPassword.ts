import type { ForgotPasswordBody } from '@/api/types';

/**
 * Pure form logic of "Forgot password?" (`POST /auth/password/forgot`). The server always answers
 * 202 whether or not the email has an account, so the app shows the same confirmation for every
 * 202 and never hints at account existence.
 */

/** Light shape check (the server validates for real): something@something.tld, no spaces. */
export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** The email language for the reset mail: the app locale (`fr` or `en`). */
export function forgotLocale(language: string | undefined): 'en' | 'fr' {
  return language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

/** Request body: trimmed email + the app locale. */
export function forgotPasswordBody(
  email: string,
  language: string | undefined,
): ForgotPasswordBody {
  return { email: email.trim(), locale: forgotLocale(language) };
}

/** Submit is possible with a plausible email, nothing in flight and no running lock. */
export function canSubmitForgot(email: string, pending: boolean, locked: boolean): boolean {
  return isPlausibleEmail(email) && !pending && !locked;
}

/**
 * Email handed from the login screen to "Forgot password?" in memory, never as a route param: on
 * web a param would put the address into the URL and the browser history.
 */
let handoffEmail = '';

/** Login screen: remember the typed email (or '') for the forgot-password screen. */
export function handOffForgotEmail(email: string): void {
  handoffEmail = email.trim();
}

/**
 * Forgot-password screen: the handed-over email ('' when none). Read-only, so a double-invoked
 * state initializer (React strict mode) still gets it; the login screen overwrites it on every tap.
 */
export function takeForgotEmail(): string {
  return handoffEmail;
}
