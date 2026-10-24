import type { NonogramPayload } from '@/api/types';
import {
  EMPTY,
  FILLED,
  MARKED,
  colOf,
  isLineSatisfied,
  isNonogramPayload,
  lineRuns,
  longestClue,
  normalizeClue,
  readNonogramGrid,
  readNonogramTitle,
  rowOf,
  satisfiedLines,
  toResponseGrid,
  toggleCell,
} from '@/challenges/nonogram/logic';

// A 5×5 heart.
const HEART = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];

function cluesOf(lines: number[][]): number[][] {
  return lines.map((line) => {
    const runs = lineRuns(line);
    return runs.length ? runs : [0];
  });
}

const HEART_PAYLOAD: NonogramPayload = {
  rows: 5,
  cols: 5,
  row_clues: cluesOf(HEART),
  col_clues: cluesOf(HEART[0].map((_, c) => HEART.map((row) => row[c]))),
};

describe('isNonogramPayload', () => {
  it('accepts a well-formed puzzle', () => {
    expect(HEART_PAYLOAD.row_clues).toEqual([[1, 1], [5], [5], [3], [1]]);
    expect(HEART_PAYLOAD.col_clues).toEqual([[2], [4], [4], [4], [2]]);
    expect(isNonogramPayload(HEART_PAYLOAD)).toBe(true);
  });

  it('accepts empty lines as [] or [0]', () => {
    expect(
      isNonogramPayload({ rows: 2, cols: 2, row_clues: [[], [2]], col_clues: [[1], [0]] }),
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'nonogram'],
    ['missing clues', { rows: 5, cols: 5 }],
    ['wrong row clue count', { ...HEART_PAYLOAD, row_clues: HEART_PAYLOAD.row_clues.slice(1) }],
    ['wrong col clue count', { ...HEART_PAYLOAD, col_clues: [[1]] }],
    ['non-integer size', { ...HEART_PAYLOAD, rows: 5.5 }],
    ['zero size', { rows: 0, cols: 0, row_clues: [], col_clues: [] }],
    ['huge size', { ...HEART_PAYLOAD, rows: 99 }],
    ['a clue that does not fit', { ...HEART_PAYLOAD, row_clues: [[3, 2], [5], [5], [3], [1]] }],
    ['a negative run', { ...HEART_PAYLOAD, row_clues: [[-1], [5], [5], [3], [1]] }],
    ['a zero mixed with runs', { ...HEART_PAYLOAD, row_clues: [[0, 2], [5], [5], [3], [1]] }],
    ['a string run', { ...HEART_PAYLOAD, row_clues: [['1'], [5], [5], [3], [1]] }],
  ])('rejects %s', (_label, payload) => {
    expect(isNonogramPayload(payload)).toBe(false);
  });
});

describe('clues', () => {
  it('computes the runs of a line (marks count as empty)', () => {
    expect(lineRuns([1, 1, 0, 1, 0])).toEqual([2, 1]);
    expect(lineRuns([1, MARKED, 1, 1, 1])).toEqual([1, 3]);
    expect(lineRuns([0, 0, 0])).toEqual([]);
    expect(lineRuns([1, 1, 1])).toEqual([3]);
  });

  it('normalizes empty-line clues', () => {
    expect(normalizeClue([0])).toEqual([]);
    expect(normalizeClue([])).toEqual([]);
    expect(normalizeClue([2, 1])).toEqual([2, 1]);
    expect(longestClue([[0], [1, 1, 1], [2]])).toBe(3);
    expect(longestClue([[0], []])).toBe(1);
  });

  it('checks whether a line matches its clue exactly', () => {
    expect(isLineSatisfied([0, 1, 0, 1, 0], [1, 1])).toBe(true);
    expect(isLineSatisfied([1, 0, 0, 0, 1], [1, 1])).toBe(true); // placement is free
    expect(isLineSatisfied([1, 1, 0, 1, 0], [1, 1])).toBe(false);
    expect(isLineSatisfied([0, 1, 0, 0, 0], [1, 1])).toBe(false);
    expect(isLineSatisfied([0, 0, 0], [0])).toBe(true);
    expect(isLineSatisfied([MARKED, MARKED, 0], [])).toBe(true);
    expect(isLineSatisfied([0, 1, 0], [0])).toBe(false);
    expect(isLineSatisfied([1, 0, 1, 1], [2, 1])).toBe(false); // order matters
  });

  it('reports satisfied rows and columns of a grid', () => {
    const cells = HEART.flat();
    expect(satisfiedLines(cells, HEART_PAYLOAD)).toEqual({
      rows: [true, true, true, true, true],
      cols: [true, true, true, true, true],
    });
    const partial = new Array<number>(25).fill(EMPTY);
    for (let c = 0; c < 5; c++) partial[5 + c] = FILLED; // row 2 only
    const lines = satisfiedLines(partial, HEART_PAYLOAD);
    expect(lines.rows).toEqual([false, true, false, false, false]);
    expect(lines.cols).toEqual([false, false, false, false, false]);
  });

  it('reads rows and columns of a flat grid', () => {
    const cells = HEART.flat();
    expect(rowOf(cells, 5, 4)).toEqual([0, 0, 1, 0, 0]);
    expect(colOf(cells, 5, 5, 0)).toEqual([0, 1, 1, 0, 0]);
  });
});

describe('cells and responses', () => {
  it('toggles fill and mark', () => {
    expect(toggleCell(EMPTY, 'fill')).toBe(FILLED);
    expect(toggleCell(FILLED, 'fill')).toBe(EMPTY);
    expect(toggleCell(MARKED, 'fill')).toBe(FILLED);
    expect(toggleCell(EMPTY, 'mark')).toBe(MARKED);
    expect(toggleCell(MARKED, 'mark')).toBe(EMPTY);
    expect(toggleCell(FILLED, 'mark')).toBe(MARKED);
  });

  it('submits marks as empty', () => {
    expect(toResponseGrid([1, MARKED, 0, 1], 2, 2)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it('reads a grid and title from correct_response', () => {
    expect(readNonogramGrid({ grid: HEART, title: 'A heart' }, 5, 5)).toEqual(HEART.flat());
    expect(readNonogramGrid({ grid: HEART }, 4, 5)).toBeNull();
    expect(readNonogramGrid({ grid: [[2]] }, 1, 1)).toBeNull();
    expect(readNonogramGrid(null, 1, 1)).toBeNull();
    expect(readNonogramTitle({ grid: HEART, title: ' A heart ' })).toBe('A heart');
    expect(readNonogramTitle({ grid: HEART, title: '' })).toBeNull();
    expect(readNonogramTitle({ grid: HEART, title: 3 })).toBeNull();
    expect(readNonogramTitle(undefined)).toBeNull();
  });
});
