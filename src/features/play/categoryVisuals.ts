import type { Category } from '@/api/types';
import type { IconName, Theme } from '@/ui';

interface CategoryVisual {
  icon: IconName;
  emoji: string;
}

/** Contract icon keys → line icon (sleek/modern/classic) and emoji (playful). */
const VISUALS: Record<string, CategoryVisual> = {
  grid: { icon: 'grid-outline', emoji: '🔢' },
  puzzle: { icon: 'extension-puzzle-outline', emoji: '🧩' },
  quote: { icon: 'chatbubble-ellipses-outline', emoji: '💬' },
  globe: { icon: 'earth-outline', emoji: '🌍' },
  landmark: { icon: 'business-outline', emoji: '🏛️' },
  leaf: { icon: 'leaf-outline', emoji: '🌿' },
  calculator: { icon: 'calculator-outline', emoji: '➗' },
  book: { icon: 'book-outline', emoji: '📚' },
};

const FALLBACK: CategoryVisual = { icon: 'sparkles-outline', emoji: '⭐' };

export function categoryVisual(icon: string | null | undefined): CategoryVisual {
  return (icon && VISUALS[icon]) || FALLBACK;
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
