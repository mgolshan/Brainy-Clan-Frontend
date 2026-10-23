import type { Category } from '@/api/types';
import { findCategory, findRootSlug } from '@/features/play/categoryVisuals';

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
