import type { MathSprintPayload, SessionItem, SudokuPayload, WordPuzzlePayload } from '@/api/types';

/**
 * Sample items for the dev theme preview, with a local stand-in for the server's scoring so
 * correct and wrong states can be tried without a backend. Negative ids keep their drafts apart
 * from real session items.
 */

const SUDOKU_4_SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];

const SUDOKU_9_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const holes4 = [1, 2, 4, 7, 9, 10, 12, 15];
const PUZZLE_9 = [
  '530070000',
  '600195000',
  '098000060',
  '800060003',
  '400803001',
  '700020006',
  '060000280',
  '000419005',
  '000080079',
].map((row) => Array.from(row, Number));

function punch(solution: number[][], holes: number[]): number[][] {
  const set = new Set(holes);
  const size = solution.length;
  return solution.map((row, r) => row.map((v, c) => (set.has(r * size + c) ? 0 : v)));
}

function item<P>(id: number, type: string, points: number, payload: P): SessionItem<P> {
  return { id, position: -id, type, is_redemption: false, answered: false, points, payload };
}

export const SAMPLE_SUDOKU_4 = item<SudokuPayload>(-11, 'sudoku', 3, {
  size: 4,
  box: [2, 2],
  grid: punch(SUDOKU_4_SOLUTION, holes4),
});

export const SAMPLE_SUDOKU_9 = item<SudokuPayload>(-12, 'sudoku', 8, {
  size: 9,
  box: [3, 3],
  grid: PUZZLE_9,
});

export const SAMPLE_MATH = item<MathSprintPayload>(-13, 'math_sprint', 1, {
  question: '7 × 8',
  answer_format: 'integer',
  time_limit_ms: 10000,
});

export const SAMPLE_MATH_FRACTION = item<MathSprintPayload>(-14, 'math_sprint', 1, {
  question: '1/2 + 1/4',
  answer_format: 'fraction',
  time_limit_ms: 15000,
});

export const SAMPLE_ANAGRAM = item<WordPuzzlePayload>(-15, 'word_puzzle', 1, {
  variant: 'anagram',
  letters: ['L', 'E', 'P', 'P', 'A'],
  hint: 'A fruit',
});

export const SAMPLE_MISSING = item<WordPuzzlePayload>(-16, 'word_puzzle', 1, {
  variant: 'missing_letter',
  pattern: 'EL_PH_NT',
  hint: null,
});

const WORD_SEARCH_GRID = ['CATXSQ', 'BOWLUP', 'GEMNNR', 'OOEKIF', 'GODZVH', 'YJLTWE'];
const WORD_SEARCH_FOUND = [
  { word: 'CAT', start: [0, 0], end: [0, 2] },
  { word: 'OWL', start: [1, 1], end: [1, 3] },
  { word: 'SUN', start: [0, 4], end: [2, 4] },
  { word: 'DOG', start: [4, 2], end: [4, 0] },
  { word: 'BEE', start: [1, 0], end: [3, 2] },
];

export const SAMPLE_WORD_SEARCH = item<WordPuzzlePayload>(-17, 'word_puzzle', 3, {
  variant: 'word_search',
  grid: WORD_SEARCH_GRID.map((row) => Array.from(row)),
  words: WORD_SEARCH_FOUND.map((f) => f.word),
});

export const CHALLENGE_SAMPLES = [
  SAMPLE_SUDOKU_4,
  SAMPLE_SUDOKU_9,
  SAMPLE_MATH,
  SAMPLE_MATH_FRACTION,
  SAMPLE_ANAGRAM,
  SAMPLE_MISSING,
  SAMPLE_WORD_SEARCH,
] as SessionItem[];

/** Local stand-in for the server's verdict on a sample item. */
export function scoreSample(
  sample: SessionItem,
  response: unknown,
): { isCorrect: boolean; correctResponse: unknown } {
  const r = response as Record<string, unknown>;
  switch (sample.id) {
    case SAMPLE_SUDOKU_4.id:
    case SAMPLE_SUDOKU_9.id: {
      const solution = sample.id === SAMPLE_SUDOKU_4.id ? SUDOKU_4_SOLUTION : SUDOKU_9_SOLUTION;
      return {
        isCorrect: JSON.stringify(r.grid) === JSON.stringify(solution),
        correctResponse: { grid: solution },
      };
    }
    case SAMPLE_MATH.id:
      return { isCorrect: r.value === '56', correctResponse: { value: '56' } };
    case SAMPLE_MATH_FRACTION.id:
      return {
        isCorrect: ['3/4', '6/8', '0.75'].includes(String(r.value)),
        correctResponse: { value: '3/4' },
      };
    case SAMPLE_ANAGRAM.id:
      return {
        isCorrect: String(r.word).toUpperCase() === 'APPLE',
        correctResponse: { word: 'APPLE' },
      };
    case SAMPLE_MISSING.id:
      return {
        isCorrect: String(r.word).toUpperCase() === 'ELEPHANT',
        correctResponse: { word: 'ELEPHANT' },
      };
    default: {
      const found = Array.isArray(r.found) ? (r.found as { word: string }[]) : [];
      return {
        isCorrect: WORD_SEARCH_FOUND.every((w) => found.some((f) => f.word === w.word)),
        correctResponse: { found: WORD_SEARCH_FOUND },
      };
    }
  }
}
