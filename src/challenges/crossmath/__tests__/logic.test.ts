import type { CrossMathPayload } from '@/api/types';
import {
  blanksOf,
  clearSlot,
  emptyDraft,
  equationState,
  equationsOf,
  evaluate,
  freeTileWithValue,
  isCrossMathDraft,
  isCrossMathPayload,
  isSolved,
  operatorGlyph,
  placeTile,
  readFills,
  toFills,
  trackSizes,
  unitFor,
  usedTiles,
  valueGrid,
} from '@/challenges/crossmath/logic';

/** Contract example shape: 5×5, + − ×. Solution: 2×4=8, 3×3=9, 5+12=17; cols 2+3=5, 4×3=12, 8+9=17. */
const P5: CrossMathPayload = {
  rows: 5,
  cols: 5,
  cells: [
    ['?', '*', '?', '=', 8],
    ['+', null, '*', null, '+'],
    ['?', '*', 3, '=', 9],
    ['=', null, '=', null, '='],
    ['?', '+', '?', '=', '?'],
  ],
  bank: [2, 3, 4, 5, 12, 17],
};
// Blanks row-major: (0,0) (0,2) (2,0) (4,0) (4,2) (4,4) → bank indexes of 2,4,3,5,12,17.
const SOLVED_P5 = [0, 2, 1, 3, 4, 5];

/** 7×7 with precedence: 8 + 7 − 6 = 9, 9 + 5×… */
const P7: CrossMathPayload = {
  rows: 7,
  cols: 7,
  cells: [
    [8, '+', '?', '-', 6, '=', 9],
    ['+', null, '*', null, '+', null, '+'],
    [9, '+', '?', '-', '?', '=', 5],
    ['*', null, '+', null, '-', null, '+'],
    ['?', '*', 4, '-', '?', '=', '?'],
    ['=', null, '=', null, '=', null, '='],
    ['?', '-', '?', '+', '?', '=', '?'],
  ],
  bank: [5, 6, 7, 7, 8, 9, 16, 30, 39, 62],
};

describe('isCrossMathPayload', () => {
  it('accepts 5×5 and 7×7 lattices', () => {
    expect(isCrossMathPayload(P5)).toBe(true);
    expect(isCrossMathPayload(P7)).toBe(true);
  });

  it.each([
    ['null', null],
    ['even size', { ...P5, rows: 4 }],
    ['bank size ≠ blanks', { ...P5, bank: [1, 2] }],
    ['negative bank number', { ...P5, bank: [-1, 3, 4, 5, 12, 17] }],
    ['fraction', { ...P5, bank: [2.5, 3, 4, 5, 12, 17] }],
    ['unknown operator', { ...P5, cells: [['?', '^', '?', '=', 8], ...P5.cells.slice(1)] }],
    [
      'number on an operator square',
      { ...P5, cells: [['?', 3, '?', '=', 8], ...P5.cells.slice(1)] },
    ],
    [
      'something on odd/odd',
      { ...P5, cells: [P5.cells[0], ['+', '+', '*', null, '+'], ...P5.cells.slice(2)] },
    ],
    ['ragged rows', { ...P5, cells: [P5.cells[0].slice(0, 4), ...P5.cells.slice(1)] }],
    [
      'no blanks',
      {
        rows: 3,
        cols: 3,
        cells: [
          [1, '=', 1],
          ['=', null, null],
          [1, null, null],
        ],
        bank: [],
      },
    ],
  ])('rejects %s', (_label, payload) => {
    expect(isCrossMathPayload(payload)).toBe(false);
  });
});

describe('evaluate (normal precedence)', () => {
  it.each([
    [[2, 3, 4], ['+', '*'], 14],
    [[2, 3, 4], ['*', '+'], 10],
    [[20, 2, 5], ['-', '*'], 10],
    [[20, 4, 2], ['/', '*'], 10],
    [[9, 3, 2], ['-', '-'], 4],
    [[12, 6, 2], ['/', '/'], 1],
    [[10, 6, 2], ['-', '/'], 7],
    [[4, 5], ['+'], 9],
  ] as const)('%j with %j = %d', (nums, ops, value) => {
    expect(evaluate(nums, ops)).toBe(value);
  });

  it('returns null for division by zero or an inexact division', () => {
    expect(evaluate([4, 0], ['/'])).toBeNull();
    expect(evaluate([7, 2], ['/'])).toBeNull();
    expect(evaluate([1, 2], [])).toBeNull();
  });
});

describe('equations', () => {
  it('finds every even row and column of the lattice', () => {
    const eqs = equationsOf(P5);
    expect(eqs).toHaveLength(6);
    expect(eqs[0]).toEqual({
      axis: 'row',
      index: 0,
      cells: [
        [0, 0],
        [0, 2],
        [0, 4],
      ],
      ops: ['*'],
      equals: [0, 3],
    });
    expect(eqs[3].axis).toBe('col');
    expect(eqs[3].ops).toEqual(['+']);
    expect(equationsOf(P7)).toHaveLength(8);
    expect(equationsOf(P7)[0].ops).toEqual(['+', '-']);
  });

  it('is open until every number is there, then true or false', () => {
    const [row0] = equationsOf(P5);
    const empty = valueGrid(P5, emptyDraft(6).placed);
    expect(equationState(row0, empty)).toBe('open');
    const right = valueGrid(P5, [0, 2, null, null, null, null]);
    expect(equationState(row0, right)).toBe('true');
    const wrong = valueGrid(P5, [2, 0, null, null, null, null]);
    expect(equationState(row0, wrong)).toBe('true'); // 4 × 2 = 8 too (commutative)
    const off = valueGrid(P5, [1, 2, null, null, null, null]);
    expect(equationState(row0, off)).toBe('false');
  });

  it('uses precedence in a 7×7 grid', () => {
    // Solution: 7, 5, 9, 6, 8, 16, 62, 39, 7, 30 → bank indexes.
    const bank = P7.bank;
    const want = [7, 5, 9, 6, 8, 16, 62, 39, 7, 30];
    const placed: number[] = [];
    for (const v of want) {
      const k = bank.findIndex((b, i) => b === v && !placed.includes(i));
      placed.push(k);
    }
    expect(isSolved(P7, placed)).toBe(true);
    // Column 0: 8 + 9 × 6 = 62 (not (8 + 9) × 6 = 102).
    const col0 = equationsOf(P7).find((e) => e.axis === 'col' && e.index === 0)!;
    expect(equationState(col0, valueGrid(P7, placed))).toBe('true');
  });
});

describe('isSolved', () => {
  it('needs every blank filled and every equation true', () => {
    expect(isSolved(P5, SOLVED_P5)).toBe(true);
    expect(isSolved(P5, [0, 2, 1, 3, 4, null])).toBe(false);
    expect(isSolved(P5, [2, 0, 1, 3, 4, 5])).toBe(false); // 4×2 ok, but column 0: 4+3 ≠ 5
  });

  it('refuses a tile used twice', () => {
    expect(isSolved(P5, [0, 0, 1, 3, 4, 5])).toBe(false);
  });
});

describe('placing tiles', () => {
  it('places, moves and returns tiles', () => {
    let placed = emptyDraft(3).placed;
    placed = placeTile(placed, 0, 2);
    expect(placed).toEqual([2, null, null]);
    // The same tile on another square moves it.
    placed = placeTile(placed, 1, 2);
    expect(placed).toEqual([null, 2, null]);
    // Another tile on a filled square replaces it (the old one is free again).
    placed = placeTile(placed, 1, 0);
    expect(placed).toEqual([null, 0, null]);
    expect([...usedTiles(placed)]).toEqual([0]);
    placed = clearSlot(placed, 1);
    expect(placed).toEqual([null, null, null]);
  });

  it('finds a free tile by value (repeated values)', () => {
    const bank = [7, 7, 9];
    expect(freeTileWithValue(bank, [null, null], 7)).toBe(0);
    expect(freeTileWithValue(bank, [0, null], 7)).toBe(1);
    expect(freeTileWithValue(bank, [0, 1], 7)).toBeNull();
    expect(freeTileWithValue(bank, [null, null], 4)).toBeNull();
  });

  it('validates drafts', () => {
    expect(isCrossMathDraft({ placed: [null, 1, 0] }, 3, 3)).toBe(true);
    expect(isCrossMathDraft({ placed: [1, 1, 0] }, 3, 3)).toBe(false);
    expect(isCrossMathDraft({ placed: [null, 5, 0] }, 3, 3)).toBe(false);
    expect(isCrossMathDraft({ placed: [null] }, 3, 3)).toBe(false);
    expect(isCrossMathDraft(null, 3, 3)).toBe(false);
  });
});

describe('fills', () => {
  it('turns the draft into [row, col, value] per blank and back', () => {
    expect(blanksOf(P5)).toEqual([
      [0, 0],
      [0, 2],
      [2, 0],
      [4, 0],
      [4, 2],
      [4, 4],
    ]);
    const fills = toFills(P5, SOLVED_P5);
    expect(fills).toEqual([
      [0, 0, 2],
      [0, 2, 4],
      [2, 0, 3],
      [4, 0, 5],
      [4, 2, 12],
      [4, 4, 17],
    ]);
    expect(toFills(P5, [0, null, null, null, null, null])).toEqual([[0, 0, 2]]);
    const grid = readFills({ fills }, 5, 5)!;
    expect(grid[4][2]).toBe(12);
    expect(grid[0][1]).toBeNull();
  });

  it('rejects malformed fills', () => {
    expect(readFills(null, 5, 5)).toBeNull();
    expect(readFills({ fills: [[9, 0, 1]] }, 5, 5)).toBeNull();
    expect(readFills({ fills: [[0, 0]] }, 5, 5)).toBeNull();
  });
});

describe('display + layout', () => {
  it('shows * as × and / as ÷', () => {
    expect(operatorGlyph('*')).toBe('×');
    expect(operatorGlyph('/')).toBe('÷');
    expect(operatorGlyph('-')).toBe('−');
    expect(operatorGlyph('+')).toBe('+');
    expect(operatorGlyph('=')).toBe('=');
  });

  it('sizes number and operator tracks to fit the width', () => {
    const unit = unitFor(7, 290, 0.5);
    expect(unit).toBeCloseTo(290 / 5.5);
    const sizes = trackSizes(7, unit, 0.5);
    expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(290);
    expect(sizes[1]).toBeCloseTo(unit / 2);
  });
});
