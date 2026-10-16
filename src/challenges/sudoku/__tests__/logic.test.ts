import {
  boxOf,
  digitCounts,
  findConflicts,
  flatten,
  hasNote,
  isFull,
  isPeer,
  isSudokuPayload,
  readGrid,
  toGrid,
  toggleNote,
} from '@/challenges/sudoku/logic';

const empty = (size: number) => new Array<number>(size * size).fill(0);
const at = (row: number, col: number, size: number) => row * size + col;

const BOXES: Record<4 | 6 | 9, [number, number]> = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };

describe('isSudokuPayload', () => {
  const grid = (size: number) => Array.from({ length: size }, () => new Array(size).fill(0));

  it.each([4, 6, 9] as const)('accepts a size-%i payload with the contract box', (size) => {
    expect(isSudokuPayload({ size, box: BOXES[size], grid: grid(size) })).toBe(true);
  });

  it('accepts a 6×6 grid with [3, 2] boxes (rows × cols still multiply to the size)', () => {
    expect(isSudokuPayload({ size: 6, box: [3, 2], grid: grid(6) })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'sudoku'],
    ['an unsupported size', { size: 5, box: [1, 5], grid: grid(5) }],
    ['a box that does not match the size', { size: 9, box: [2, 3], grid: grid(9) }],
    ['a box with three numbers', { size: 4, box: [2, 2, 1], grid: grid(4) }],
    ['a zero box', { size: 4, box: [0, 4], grid: grid(4) }],
    ['a missing grid', { size: 4, box: [2, 2] }],
    ['too few rows', { size: 4, box: [2, 2], grid: grid(3) }],
    [
      'a short row',
      {
        size: 4,
        box: [2, 2],
        grid: [
          [0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      },
    ],
    ['a value above the size', { size: 4, box: [2, 2], grid: [[5, 0, 0, 0], ...grid(4).slice(1)] }],
    ['a negative value', { size: 4, box: [2, 2], grid: [[-1, 0, 0, 0], ...grid(4).slice(1)] }],
    ['a fractional value', { size: 4, box: [2, 2], grid: [[1.5, 0, 0, 0], ...grid(4).slice(1)] }],
    ['a string value', { size: 4, box: [2, 2], grid: [['1', 0, 0, 0], ...grid(4).slice(1)] }],
  ])('rejects %s', (_label, payload) => {
    expect(isSudokuPayload(payload)).toBe(false);
  });
});

describe('readGrid', () => {
  it('reads a { grid } of the expected size', () => {
    const grid = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];
    expect(readGrid({ grid }, 4)).toEqual(grid);
  });

  it.each([null, undefined, 'x', {}, { grid: null }, { grid: [[1, 2]] }])(
    'returns null for %p',
    (value) => {
      expect(readGrid(value, 4)).toBeNull();
    },
  );
});

describe('flatten / toGrid', () => {
  it('round-trips a grid through the flat cell array', () => {
    const grid = [
      [1, 0, 0, 2],
      [0, 3, 0, 0],
      [0, 0, 4, 0],
      [2, 0, 0, 1],
    ];
    const flat = flatten(grid);
    expect(flat).toHaveLength(16);
    expect(flat[at(1, 1, 4)]).toBe(3);
    expect(toGrid(flat, 4)).toEqual(grid);
  });
});

describe('boxOf', () => {
  it('numbers the 2×2 boxes of a 4×4 grid row by row', () => {
    expect([0, 1, 2, 3].map((c) => boxOf(at(0, c, 4), 4, [2, 2]))).toEqual([0, 0, 1, 1]);
    expect([0, 1, 2, 3].map((c) => boxOf(at(3, c, 4), 4, [2, 2]))).toEqual([2, 2, 3, 3]);
  });

  it('uses 2-row × 3-column boxes for 6×6 (two boxes per band, three bands)', () => {
    const row0 = [0, 1, 2, 3, 4, 5].map((c) => boxOf(at(0, c, 6), 6, [2, 3]));
    const row2 = [0, 1, 2, 3, 4, 5].map((c) => boxOf(at(2, c, 6), 6, [2, 3]));
    const row5 = [0, 1, 2, 3, 4, 5].map((c) => boxOf(at(5, c, 6), 6, [2, 3]));
    expect(row0).toEqual([0, 0, 0, 1, 1, 1]);
    expect(row2).toEqual([2, 2, 2, 3, 3, 3]);
    expect(row5).toEqual([4, 4, 4, 5, 5, 5]);
  });

  it('numbers the nine 3×3 boxes of a 9×9 grid', () => {
    expect(boxOf(at(0, 0, 9), 9, [3, 3])).toBe(0);
    expect(boxOf(at(4, 4, 9), 9, [3, 3])).toBe(4);
    expect(boxOf(at(2, 8, 9), 9, [3, 3])).toBe(2);
    expect(boxOf(at(8, 0, 9), 9, [3, 3])).toBe(6);
    expect(boxOf(at(8, 8, 9), 9, [3, 3])).toBe(8);
  });
});

describe('findConflicts', () => {
  it.each([4, 6, 9] as const)('finds nothing on an empty size-%i grid', (size) => {
    expect(findConflicts(empty(size), size, BOXES[size]).size).toBe(0);
  });

  it.each([4, 6, 9] as const)('flags both cells of a row duplicate (size %i)', (size) => {
    const values = empty(size);
    // Same row, far apart (different boxes).
    values[at(0, 0, size)] = 1;
    values[at(0, size - 1, size)] = 1;
    expect([...findConflicts(values, size, BOXES[size])].sort((a, b) => a - b)).toEqual([
      at(0, 0, size),
      at(0, size - 1, size),
    ]);
  });

  it.each([4, 6, 9] as const)('flags both cells of a column duplicate (size %i)', (size) => {
    const values = empty(size);
    values[at(0, 1, size)] = 2;
    values[at(size - 1, 1, size)] = 2;
    expect(findConflicts(values, size, BOXES[size])).toEqual(
      new Set([at(0, 1, size), at(size - 1, 1, size)]),
    );
  });

  it.each([4, 6, 9] as const)('flags a duplicate that only shares a box (size %i)', (size) => {
    const [boxRows, boxCols] = BOXES[size];
    const values = empty(size);
    // Opposite corners of the first box: different row and column.
    const a = at(0, 0, size);
    const b = at(boxRows - 1, boxCols - 1, size);
    values[a] = 3;
    values[b] = 3;
    expect(findConflicts(values, size, BOXES[size])).toEqual(new Set([a, b]));
  });

  it('does not flag the same digit in different rows, columns and boxes', () => {
    const values = empty(6);
    values[at(0, 0, 6)] = 4; // box 0
    values[at(2, 3, 6)] = 4; // box 3
    values[at(5, 5, 6)] = 4; // box 5
    expect(findConflicts(values, 6, [2, 3]).size).toBe(0);
  });

  it('respects the 6×6 box shape: 2 rows × 3 columns', () => {
    // (0,0) and (1,2) share box 0 with [2,3] boxes, but not with [3,2] boxes.
    const values = empty(6);
    values[at(0, 0, 6)] = 5;
    values[at(1, 2, 6)] = 5;
    expect(findConflicts(values, 6, [2, 3]).size).toBe(2);
    expect(findConflicts(values, 6, [3, 2]).size).toBe(0);
  });

  it('flags every copy of a triple duplicate and leaves other cells alone', () => {
    const values = empty(9);
    values[at(4, 0, 9)] = 7;
    values[at(4, 4, 9)] = 7;
    values[at(4, 8, 9)] = 7;
    values[at(0, 0, 9)] = 1;
    expect(findConflicts(values, 9, [3, 3])).toEqual(
      new Set([at(4, 0, 9), at(4, 4, 9), at(4, 8, 9)]),
    );
  });

  it('finds no conflicts in a valid complete 9×9 solution', () => {
    const solution = [
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
    const flat = flatten(solution);
    expect(findConflicts(flat, 9, [3, 3]).size).toBe(0);
    expect(isFull(flat)).toBe(true);
  });
});

describe('isFull / isPeer / digitCounts', () => {
  it('isFull is false while any cell is empty', () => {
    expect(isFull([1, 2, 3, 0])).toBe(false);
    expect(isFull([1, 2, 3, 4])).toBe(true);
  });

  it('isPeer: same row, column or box', () => {
    const box: [number, number] = [2, 3];
    expect(isPeer(at(0, 0, 6), at(0, 5, 6), 6, box)).toBe(true); // row
    expect(isPeer(at(0, 0, 6), at(5, 0, 6), 6, box)).toBe(true); // column
    expect(isPeer(at(0, 0, 6), at(1, 2, 6), 6, box)).toBe(true); // box
    expect(isPeer(at(0, 0, 6), at(2, 3, 6), 6, box)).toBe(false);
  });

  it('digitCounts counts each placed digit (index = digit, 0 ignored)', () => {
    expect(digitCounts([1, 0, 2, 1, 4, 0], 4)).toEqual([0, 2, 1, 0, 1]);
  });
});

describe('pencil notes bit mask', () => {
  it('toggles digits on and off independently', () => {
    let mask = 0;
    mask = toggleNote(mask, 3);
    mask = toggleNote(mask, 9);
    expect(hasNote(mask, 3)).toBe(true);
    expect(hasNote(mask, 9)).toBe(true);
    expect(hasNote(mask, 1)).toBe(false);
    mask = toggleNote(mask, 3);
    expect(hasNote(mask, 3)).toBe(false);
    expect(hasNote(mask, 9)).toBe(true);
  });
});
