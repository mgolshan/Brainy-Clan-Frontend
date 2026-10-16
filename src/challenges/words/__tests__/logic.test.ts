import type { GridCell } from '@/api/types';
import {
  isAnagramPayload,
  isMissingLetterPayload,
  isPlacement,
  isWordPuzzlePayload,
  isWordSearchPayload,
  lineCells,
  matchSelection,
  normalizeWord,
  readFound,
  readWord,
  shuffledOrder,
  snapToLine,
} from '@/challenges/words/logic';

/**
 * 5×5 grid with words in several directions:
 *   CAT   row 0, left → right        (0,0)-(0,2)
 *   DOG   column 4, top → bottom     (0,4)-(2,4)
 *   SUN   diagonal ↘                 (1,0)-(3,2)
 *   OWL   row 4, right → left        (4,4)-(4,2)
 *   BEE   diagonal ↗                 (4,0)-(2,2)
 */
const GRID = [
  ['C', 'A', 'T', 'X', 'D'],
  ['S', 'Q', 'Z', 'Y', 'O'],
  ['K', 'U', 'E', 'V', 'G'],
  ['J', 'E', 'N', 'P', 'R'],
  ['B', 'M', 'L', 'W', 'O'],
];

describe('payload guards', () => {
  it('accepts the contract examples of each variant', () => {
    expect(
      isWordPuzzlePayload({ variant: 'anagram', letters: ['T', 'A', 'C'], hint: 'An animal' }),
    ).toBe(true);
    expect(
      isWordPuzzlePayload({ variant: 'missing_letter', pattern: 'EL_PHANT', hint: null }),
    ).toBe(true);
    expect(
      isWordPuzzlePayload({ variant: 'word_search', grid: [['C', 'A', 'T']], words: ['CAT'] }),
    ).toBe(true);
  });

  it('accepts an omitted hint', () => {
    expect(isAnagramPayload({ variant: 'anagram', letters: ['A'] })).toBe(true);
    expect(isMissingLetterPayload({ variant: 'missing_letter', pattern: '_' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a number', 3],
    ['an unknown variant', { variant: 'crossword', letters: ['A'] }],
    ['an anagram without letters', { variant: 'anagram', letters: [], hint: null }],
    ['an anagram with an empty letter', { variant: 'anagram', letters: ['A', ''], hint: null }],
    ['an anagram with a numeric hint', { variant: 'anagram', letters: ['A'], hint: 3 }],
    [
      'a missing-letter pattern without a gap',
      { variant: 'missing_letter', pattern: 'CAT', hint: null },
    ],
    [
      'a missing-letter pattern that is not a string',
      { variant: 'missing_letter', pattern: ['_'] },
    ],
    ['a word search without rows', { variant: 'word_search', grid: [], words: ['CAT'] }],
    [
      'a word search with ragged rows',
      { variant: 'word_search', grid: [['A', 'B'], ['C']], words: ['AB'] },
    ],
    ['a word search without words', { variant: 'word_search', grid: [['A']], words: [] }],
    ['a word search with an empty row', { variant: 'word_search', grid: [[]], words: ['A'] }],
  ])('rejects %s', (_label, payload) => {
    expect(isWordPuzzlePayload(payload)).toBe(false);
  });

  it('variant guards do not accept other variants', () => {
    const anagram = { variant: 'anagram' as const, letters: ['A'], hint: null };
    expect(isWordSearchPayload(anagram as never)).toBe(false);
    expect(isMissingLetterPayload(anagram as never)).toBe(false);
  });
});

describe('readWord / readFound / isPlacement', () => {
  it('reads { word }', () => {
    expect(readWord({ word: 'CAT' })).toBe('CAT');
    expect(readWord({})).toBeNull();
    expect(readWord(null)).toBeNull();
  });

  it('keeps only well-formed placements', () => {
    const good = { word: 'CAT', start: [0, 0], end: [0, 2] };
    expect(
      readFound({
        found: [
          good,
          { word: 'DOG', start: [0, -1], end: [2, 4] },
          { word: 'X', start: [0, 0] },
          null,
        ],
      }),
    ).toEqual([good]);
    expect(readFound({ found: 'nope' })).toEqual([]);
    expect(readFound(undefined)).toEqual([]);
    expect(isPlacement({ word: 'A', start: [0.5, 0], end: [0, 0] })).toBe(false);
  });
});

describe('normalizeWord', () => {
  it('trims and upper-cases', () => {
    expect(normalizeWord('  cat ')).toBe('CAT');
  });

  it('upper-cases French accents', () => {
    expect(normalizeWord('été')).toBe('ÉTÉ');
    expect(normalizeWord('garçon')).toBe('GARÇON');
    expect(normalizeWord('cœur')).toBe('CŒUR');
  });

  it('treats composed and decomposed accents as the same word (contract: NFC)', () => {
    const composed = 'café'; // é as one code point
    const decomposed = 'café'; // e + combining acute accent
    expect(normalizeWord(decomposed)).toBe(normalizeWord(composed));
    expect(normalizeWord(decomposed)).toBe('CAFÉ');
  });
});

describe('lineCells', () => {
  const cases: [string, GridCell, GridCell, GridCell[]][] = [
    [
      '→',
      [0, 0],
      [0, 2],
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
    ],
    [
      '←',
      [0, 2],
      [0, 0],
      [
        [0, 2],
        [0, 1],
        [0, 0],
      ],
    ],
    [
      '↓',
      [0, 4],
      [2, 4],
      [
        [0, 4],
        [1, 4],
        [2, 4],
      ],
    ],
    [
      '↑',
      [2, 4],
      [0, 4],
      [
        [2, 4],
        [1, 4],
        [0, 4],
      ],
    ],
    [
      '↘',
      [1, 0],
      [3, 2],
      [
        [1, 0],
        [2, 1],
        [3, 2],
      ],
    ],
    [
      '↖',
      [3, 2],
      [1, 0],
      [
        [3, 2],
        [2, 1],
        [1, 0],
      ],
    ],
    [
      '↗',
      [4, 0],
      [2, 2],
      [
        [4, 0],
        [3, 1],
        [2, 2],
      ],
    ],
    [
      '↙',
      [2, 2],
      [4, 0],
      [
        [2, 2],
        [3, 1],
        [4, 0],
      ],
    ],
  ];

  it.each(cases)('walks %s', (_dir, start, end, cells) => {
    expect(lineCells(start, end)).toEqual(cells);
  });

  it('is a single cell when start = end', () => {
    expect(lineCells([1, 1], [1, 1])).toEqual([[1, 1]]);
  });

  it('rejects lines that are not straight or 45°', () => {
    expect(lineCells([0, 0], [1, 2])).toBeNull();
    expect(lineCells([0, 0], [3, 1])).toBeNull();
  });
});

describe('matchSelection (8 directions)', () => {
  const words = ['CAT', 'DOG', 'SUN', 'OWL', 'BEE', 'GUN'];

  it('finds a word read left → right', () => {
    expect(matchSelection(GRID, [0, 0], [0, 2], words)).toEqual({
      word: 'CAT',
      start: [0, 0],
      end: [0, 2],
    });
  });

  it('finds a word selected backwards and orients it the reading way', () => {
    expect(matchSelection(GRID, [0, 2], [0, 0], words)).toEqual({
      word: 'CAT',
      start: [0, 0],
      end: [0, 2],
    });
  });

  it('finds a word read top → bottom and bottom → top', () => {
    const dog = { word: 'DOG', start: [0, 4], end: [2, 4] };
    expect(matchSelection(GRID, [0, 4], [2, 4], words)).toEqual(dog);
    expect(matchSelection(GRID, [2, 4], [0, 4], words)).toEqual(dog);
  });

  it('finds a word on the ↘ diagonal from either end', () => {
    const sun = { word: 'SUN', start: [1, 0], end: [3, 2] };
    expect(matchSelection(GRID, [1, 0], [3, 2], words)).toEqual(sun);
    expect(matchSelection(GRID, [3, 2], [1, 0], words)).toEqual(sun);
  });

  it('finds a word written right → left', () => {
    // O W L from (4,4) leftwards.
    expect(matchSelection(GRID, [4, 4], [4, 2], words)).toEqual({
      word: 'OWL',
      start: [4, 4],
      end: [4, 2],
    });
    expect(matchSelection(GRID, [4, 2], [4, 4], words)).toEqual({
      word: 'OWL',
      start: [4, 4],
      end: [4, 2],
    });
  });

  it('finds a word on the ↗ diagonal from either end', () => {
    // B (4,0), E (3,1), E (2,2).
    const bee = { word: 'BEE', start: [4, 0], end: [2, 2] };
    expect(matchSelection(GRID, [4, 0], [2, 2], words)).toEqual(bee);
    expect(matchSelection(GRID, [2, 2], [4, 0], words)).toEqual(bee);
  });

  it('finds a word on the ↖ / ↙ diagonal', () => {
    // Dedicated grids for the two remaining diagonals.
    const grid = [
      ['N', 'X', 'X'],
      ['X', 'U', 'X'],
      ['X', 'X', 'G'],
    ];
    // GUN reads ↖ from (2,2) to (0,0).
    expect(matchSelection(grid, [2, 2], [0, 0], ['GUN'])).toEqual({
      word: 'GUN',
      start: [2, 2],
      end: [0, 0],
    });
    const grid2 = [
      ['X', 'X', 'G'],
      ['X', 'U', 'X'],
      ['N', 'X', 'X'],
    ];
    // GUN reads ↙ from (0,2) to (2,0).
    expect(matchSelection(grid2, [0, 2], [2, 0], ['GUN'])).toEqual({
      word: 'GUN',
      start: [0, 2],
      end: [2, 0],
    });
  });

  it('ignores words that are already found (not in remaining)', () => {
    expect(matchSelection(GRID, [0, 0], [0, 2], ['DOG'])).toBeNull();
  });

  it('rejects single cells, crooked lines and non-words', () => {
    expect(matchSelection(GRID, [0, 0], [0, 0], words)).toBeNull();
    expect(matchSelection(GRID, [0, 0], [1, 2], words)).toBeNull();
    expect(matchSelection(GRID, [0, 0], [0, 3], words)).toBeNull(); // CATX
  });

  it('matches case-insensitively, including accented letters', () => {
    const grid = [['é', 't', 'é']];
    expect(matchSelection(grid, [0, 0], [0, 2], ['ÉTÉ'])).toEqual({
      word: 'ÉTÉ',
      start: [0, 0],
      end: [0, 2],
    });
  });

  it('matches a decomposed accent in the word list against composed grid letters', () => {
    const grid = [['C', 'A', 'F', 'É']];
    expect(matchSelection(grid, [0, 0], [0, 3], ['CAFÉ'])).toEqual({
      word: 'CAFÉ',
      start: [0, 0],
      end: [0, 3],
    });
  });

  it('does not crash on a selection that leaves the grid', () => {
    expect(matchSelection(GRID, [0, 0], [0, 7], words)).toBeNull();
  });
});

describe('snapToLine', () => {
  it('returns the start for a zero-length drag', () => {
    expect(snapToLine([2, 2], [2, 2], 5, 5)).toEqual([2, 2]);
  });

  it.each<[string, GridCell, GridCell]>([
    ['→', [2, 4], [2, 4]],
    ['←', [2, 0], [2, 0]],
    ['↓', [4, 2], [4, 2]],
    ['↑', [0, 2], [0, 2]],
    ['↘', [4, 4], [4, 4]],
    ['↖', [0, 0], [0, 0]],
    ['↗', [0, 4], [0, 4]],
    ['↙', [4, 0], [4, 0]],
  ])('keeps an exact %s drag from the centre', (_dir, target, expected) => {
    expect(snapToLine([2, 2], target, 5, 5)).toEqual(expected);
  });

  it('snaps a slightly crooked horizontal drag onto the row', () => {
    expect(snapToLine([2, 0], [3, 4], 5, 5)).toEqual([2, 4]);
  });

  it('snaps a slightly crooked diagonal drag onto the diagonal', () => {
    expect(snapToLine([0, 0], [3, 4], 5, 5)).toEqual([4, 4]);
  });

  it('clips the line to the grid', () => {
    // Diagonal ↘ from (3,3) dragged far: only one step fits in a 5×5 grid.
    expect(snapToLine([3, 3], [6, 7], 5, 5)).toEqual([4, 4]);
    // Straight right past the edge.
    expect(snapToLine([0, 3], [0, 9], 5, 5)).toEqual([0, 4]);
  });
});

describe('shuffledOrder', () => {
  it('returns a permutation that differs from the current order', () => {
    const current = [0, 1, 2, 3, 4];
    for (let i = 0; i < 20; i++) {
      const next = shuffledOrder(current);
      expect([...next].sort()).toEqual(current);
      expect(next).not.toEqual(current);
    }
  });

  it('leaves 0 or 1 items alone', () => {
    expect(shuffledOrder([])).toEqual([]);
    expect(shuffledOrder([0])).toEqual([0]);
  });
});
