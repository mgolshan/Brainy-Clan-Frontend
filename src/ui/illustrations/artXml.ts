import { CATEGORY_ART, FALLBACK_ART } from './categoryArt.generated';

/** The seeded top-level category slugs (backend `categories.php`) that have their own scene. */
export const CATEGORY_ART_SLUGS = Object.keys(CATEGORY_ART);

export function hasCategoryArt(slug: string | null | undefined): boolean {
  return !!slug && Object.prototype.hasOwnProperty.call(CATEGORY_ART, slug);
}

/**
 * SVG markup for a category: its own scene, else its parent's (sub-categories), else the
 * neutral "Ollie with a question mark" fallback.
 */
export function categoryArtXml(
  slug: string | null | undefined,
  parentSlug?: string | null,
): string {
  if (hasCategoryArt(slug)) return CATEGORY_ART[slug!];
  if (hasCategoryArt(parentSlug)) return CATEGORY_ART[parentSlug!];
  return FALLBACK_ART;
}
