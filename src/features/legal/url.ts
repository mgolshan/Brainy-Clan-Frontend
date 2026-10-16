/**
 * Language helpers for the backend legal endpoints. The contract offers `?lang=fr` on `GET /legal`
 * (localized `summary`, French page URLs) and on the `/legal/*` pages; English is the default.
 */

/** `'fr'` when the app language is French, else `undefined` (English, the server default). */
export function legalLang(language: string | undefined): 'fr' | undefined {
  return language?.toLowerCase().startsWith('fr') ? 'fr' : undefined;
}

/** `GET /legal` path for the app language. */
export function legalPath(language: string | undefined): string {
  return legalLang(language) ? '/legal?lang=fr' : '/legal';
}

/**
 * The legal page URL in the app language: adds `lang=fr` for French unless the URL already has a
 * `lang` parameter (URLs from `GET /legal?lang=fr` already carry it).
 */
export function localizedLegalUrl(url: string, language: string | undefined): string {
  if (!legalLang(language) || /[?&]lang=/.test(url)) return url;
  const hashAt = url.indexOf('#');
  const base = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt);
  return `${base}${base.includes('?') ? '&' : '?'}lang=fr${hash}`;
}
