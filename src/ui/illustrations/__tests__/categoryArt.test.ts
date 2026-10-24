import { CATEGORY_ART, FALLBACK_ART } from '@/ui/illustrations/categoryArt.generated';
import { CATEGORY_ART_SLUGS, categoryArtXml, hasCategoryArt } from '@/ui/illustrations';

// The 17 seeded top-level slugs (Brainy-Clan-Backend database/seeders/data/categories.php).
const TOP_LEVEL = [
  'world-geography',
  'science-nature',
  'wisdom-cards',
  'math-sprint',
  'sudoku',
  'word-puzzles',
  'history',
  'vocabulary-spelling',
  // added 2026-10-23
  'logic-riddles',
  'language-swap',
  'inventions-technology',
  'our-planet',
  'art-music',
  'food-world',
  'sports-games',
  'brain-games',
  'life-skills',
];

describe('category art', () => {
  it('has a distinct scene for every top-level slug', () => {
    expect(TOP_LEVEL).toHaveLength(17);
    expect([...CATEGORY_ART_SLUGS].sort()).toEqual([...TOP_LEVEL].sort());
    const all = TOP_LEVEL.map((slug) => categoryArtXml(slug));
    expect(new Set([...all, FALLBACK_ART]).size).toBe(TOP_LEVEL.length + 1);
    for (const slug of TOP_LEVEL) expect(hasCategoryArt(slug)).toBe(true);
  });

  it('is valid, id-free SVG (many scenes share one web page)', () => {
    for (const svg of [...Object.values(CATEGORY_ART), FALLBACK_ART]) {
      expect(svg).toMatch(/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg' viewBox='0 0 256 256'>/);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).not.toMatch(/\sid=|url\(#/);
      expect(svg).not.toMatch(/NaN|undefined/);
      // transparent: no full-canvas background rect
      expect(svg).not.toMatch(/<rect[^>]*width='256'/);
    }
  });

  it('uses the parent scene for sub-categories, else the Ollie fallback', () => {
    expect(categoryArtXml('capitals', 'world-geography')).toBe(CATEGORY_ART['world-geography']);
    expect(categoryArtXml('history', 'sudoku')).toBe(CATEGORY_ART.history);
    expect(categoryArtXml('capitals')).toBe(FALLBACK_ART);
    expect(categoryArtXml('capitals', 'nope')).toBe(FALLBACK_ART);
    expect(categoryArtXml('', undefined)).toBe(FALLBACK_ART);
    expect(categoryArtXml('constructor')).toBe(FALLBACK_ART);
    expect(hasCategoryArt('toString')).toBe(false);
  });
});
