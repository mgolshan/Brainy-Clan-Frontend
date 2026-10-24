import type { Category, CategoryIcon } from '@/api/types';
import type { IconName, Theme } from '@/ui';

interface CategoryVisual {
  icon: IconName;
  emoji: string;
}

/** Contract icon keys → line icon (sleek/modern/classic) and emoji (playful). */
const VISUALS: Record<CategoryIcon, CategoryVisual> = {
  grid: { icon: 'grid-outline', emoji: '🔢' },
  puzzle: { icon: 'extension-puzzle-outline', emoji: '🧩' },
  quote: { icon: 'chatbubble-ellipses-outline', emoji: '💬' },
  globe: { icon: 'earth-outline', emoji: '🌍' },
  landmark: { icon: 'business-outline', emoji: '🏛️' },
  leaf: { icon: 'leaf-outline', emoji: '🌿' },
  calculator: { icon: 'calculator-outline', emoji: '➗' },
  book: { icon: 'book-outline', emoji: '📚' },
  bulb: { icon: 'bulb-outline', emoji: '💡' },
  language: { icon: 'language-outline', emoji: '🗣️' },
  rocket: { icon: 'rocket-outline', emoji: '🚀' },
  // `globe` (geography) already uses the earth glyph; Our Planet gets sun + cloud (weather, nature)
  earth: { icon: 'partly-sunny-outline', emoji: '🌦️' },
  palette: { icon: 'color-palette-outline', emoji: '🎨' },
  restaurant: { icon: 'restaurant-outline', emoji: '🍲' },
  football: { icon: 'football-outline', emoji: '⚽' },
  shield: { icon: 'shield-checkmark-outline', emoji: '🦺' },
  sparkles: { icon: 'sparkles-outline', emoji: '✨' },
};

const hasVisual = (icon: string): icon is CategoryIcon =>
  Object.prototype.hasOwnProperty.call(VISUALS, icon);

/** Unknown keys (e.g. a newer backend): a neutral glyph that no contract key uses. */
const FALLBACK: CategoryVisual = { icon: 'shapes-outline', emoji: '⭐' };

export function categoryVisual(icon: string | null | undefined): CategoryVisual {
  return icon && hasVisual(icon) ? VISUALS[icon] : FALLBACK;
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 33 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Per-category color from the theme palette: by position among siblings when known (no two
 * neighbours share a color), else a stable hash of the slug.
 */
export function categoryColor(
  theme: Theme,
  category: Pick<Category, 'slug'>,
  index?: number,
): string {
  const palette = theme.colors.categories;
  return palette[(index ?? hash(category.slug)) % palette.length];
}

/** Depth-first search in the category tree. */
export function findCategory(tree: Category[] | undefined, id: number): Category | undefined {
  if (!tree) return undefined;
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findCategory(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Slug of the top-level ancestor of a category (its own slug when it is top-level), so
 * sub-categories at any depth show their family's illustration. `undefined` when not found.
 */
export function findRootSlug(tree: Category[] | undefined, id: number): string | undefined {
  if (!tree) return undefined;
  for (const root of tree) {
    if (root.id === id || findCategory(root.children, id)) return root.slug;
  }
  return undefined;
}
