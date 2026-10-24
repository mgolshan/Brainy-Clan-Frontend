/**
 * Public website and support contact (docs/PLAN.md "Moe's answers (2026-10-22)"). Defaults are the
 * production values; `EXPO_PUBLIC_WEBSITE_URL` / `EXPO_PUBLIC_SUPPORT_EMAIL` override them (e.g. a
 * staging site). The website serves the legal pages, support, account deletion and password reset.
 */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** `https://brainyclan.com`, without trailing slash. */
export const WEBSITE_URL: string = (
  clean(process.env.EXPO_PUBLIC_WEBSITE_URL) ?? 'https://brainyclan.com'
).replace(/\/+$/, '');

export const SUPPORT_EMAIL: string =
  clean(process.env.EXPO_PUBLIC_SUPPORT_EMAIL) ?? 'support@brainyclan.com';

/** Website pages the app links to. */
export const WEBSITE_LINKS = {
  privacy: `${WEBSITE_URL}/privacy`,
  terms: `${WEBSITE_URL}/terms`,
  support: `${WEBSITE_URL}/support`,
  accountDeletion: `${WEBSITE_URL}/account/delete`,
  help: `${WEBSITE_URL}/help`,
} as const;

/**
 * Articles of the "How to play" help center (`/help`, backend `resources/help/*.php`) the app
 * links to. The ids are the page anchors; the backend's WebsiteTest checks they exist.
 */
export const HELP_ANCHORS = ['invite-kids', 'sign-in-code', 'family-chat'] as const;
export type HelpAnchor = (typeof HELP_ANCHORS)[number];

/**
 * The help center in the app language (`?lang=fr` for French, the page's default is English),
 * optionally opened at one article: `https://brainyclan.com/help?lang=fr#sign-in-code`.
 */
export function helpUrl(
  language: string | undefined,
  anchor?: HelpAnchor,
  base: string = WEBSITE_LINKS.help,
): string {
  const lang = language?.toLowerCase().startsWith('fr') ? '?lang=fr' : '';
  return `${base}${lang}${anchor ? `#${anchor}` : ''}`;
}

/** `mailto:` link to support with a subject line. */
export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
