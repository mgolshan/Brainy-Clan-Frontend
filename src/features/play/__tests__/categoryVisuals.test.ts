import type { Category, CategoryIcon } from '@/api/types';
import { categoryVisual, findCategory, findRootSlug } from '@/features/play/categoryVisuals';

const node = (id: number, slug: string, children: Category[] = []) =>
  ({ id, slug, name: slug, children }) as unknown as Category;

const tree = [
  node(1, 'world-geography', [node(11, 'capitals', [node(111, 'europe-capitals')])]),
  node(2, 'math-sprint'),
];

describe('findRootSlug', () => {
  it('returns the top-level ancestor at any depth', () => {
    expect(findRootSlug(tree, 1)).toBe('world-geography');
    expect(findRootSlug(tree, 11)).toBe('world-geography');
    expect(findRootSlug(tree, 111)).toBe('world-geography');
    expect(findRootSlug(tree, 2)).toBe('math-sprint');
  });

  it('is undefined for unknown ids or no tree', () => {
    expect(findRootSlug(tree, 999)).toBeUndefined();
    expect(findRootSlug(undefined, 1)).toBeUndefined();
  });

  it('agrees with findCategory', () => {
    expect(findCategory(tree, 111)?.slug).toBe('europe-capitals');
  });
});

describe('categoryVisual', () => {
  // Every contract icon key (docs/API.md, Category `icon`).
  const KEYS: CategoryIcon[] = [
    'grid',
    'puzzle',
    'quote',
    'globe',
    'landmark',
    'leaf',
    'calculator',
    'book',
    'bulb',
    'language',
    'rocket',
    'earth',
    'palette',
    'restaurant',
    'football',
    'shield',
    'sparkles',
    'crossmath',
    'maze',
    'lock',
  ];
  const fallback = categoryVisual(null);

  it('maps every contract key to its own icon (not the fallback)', () => {
    for (const key of KEYS) {
      const visual = categoryVisual(key);
      expect(visual.icon).not.toBe(fallback.icon);
      expect(visual.emoji).not.toBe(fallback.emoji);
    }
    expect(new Set(KEYS.map((k) => categoryVisual(k).icon)).size).toBe(KEYS.length);
    expect(new Set(KEYS.map((k) => categoryVisual(k).emoji)).size).toBe(KEYS.length);
  });

  it('gives the level-up puzzles their own glyphs', () => {
    expect(categoryVisual('crossmath').icon).toBe('add-circle-outline');
    expect(categoryVisual('maze').icon).toBe('trail-sign-outline');
    expect(categoryVisual('lock').icon).toBe('lock-closed-outline');
  });

  it('falls back to the generic icon for unknown, empty or prototype keys', () => {
    expect(fallback.icon).toBe('shapes-outline');
    for (const key of ['nope', '', undefined, 'constructor', 'toString', '__proto__']) {
      expect(categoryVisual(key)).toEqual(fallback);
    }
  });
});
