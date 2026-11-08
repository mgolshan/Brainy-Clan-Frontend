import type {
  CrossMathCell,
  CrossMathFill,
  CrossMathOperator,
  CrossMathPayload,
} from '@/api/types';

/**
 * Pure Cross Math rules (API.md "Level-up puzzles"). The grid is a lattice: numbers on even rows
 * and even columns, operators between them, `null` on odd row + odd column. Every even row and
 * every even column whose odd cells are operators ending in `=` is one equation,
 * `a op b (op c) = d`, evaluated with normal precedence (× ÷ before + −, then left to right);
 * every division must be exact and never by 0. Blanks (`"?"`) are filled with the `bank` tiles.
 * The app only checks the member's own equations (no solution is known before scoring).
 */

const OPERATORS: readonly string[] = ['+', '-', '*', '/', '='];
/** Generous bounds around the contract's 5×5 and 7×7. */
const MIN_SIDE = 3;
const MAX_SIDE = 11;
const MAX_VALUE = 100000;

export type MathOp = Exclude<CrossMathOperator, '='>;

/** One equation of the lattice: its number cells (in order) and the operators between them. */
export interface Equation {
  /** `row` or `col`, and which one (a grid index). */
  axis: 'row' | 'col';
  index: number;
  /** Number cells `[row, col]`, the last one is the result (right of `=`). */
  cells: [number, number][];
  /** Operators between the left-hand numbers (length = cells.length - 2). */
  ops: MathOp[];
  /** Cell of the `=` sign. */
  equals: [number, number];
}

const isWhole = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_VALUE;

function isCell(v: unknown): v is CrossMathCell {
  return v === null || v === '?' || isWhole(v) || (typeof v === 'string' && OPERATORS.includes(v));
}

const isNumberCell = (v: CrossMathCell): v is number | '?' => v === '?' || typeof v === 'number';

/** Cells along a row or column. */
function line(cells: CrossMathCell[][], axis: 'row' | 'col', index: number): CrossMathCell[] {
  return axis === 'row' ? cells[index] : cells.map((row) => row[index]);
}

/**
 * The equation of one even line, or null when the line is not one (e.g. its odd cells are
 * empty): odd positions are operators, the second-to-last is the only `=`.
 */
function lineEquation(
  cells: CrossMathCell[][],
  axis: 'row' | 'col',
  index: number,
): Equation | null {
  const values = line(cells, axis, index);
  const n = values.length;
  if (n < 3 || n % 2 === 0) return null;
  const at = (k: number): [number, number] => (axis === 'row' ? [index, k] : [k, index]);
  const nums: [number, number][] = [];
  const ops: MathOp[] = [];
  for (let k = 0; k < n; k++) {
    const v = values[k];
    if (k % 2 === 0) {
      if (!isNumberCell(v)) return null;
      nums.push(at(k));
    } else if (k === n - 2) {
      if (v !== '=') return null;
    } else {
      if (v === '=' || v === null || typeof v !== 'string' || v === '?') return null;
      ops.push(v as MathOp);
    }
  }
  return { axis, index, cells: nums, ops, equals: at(n - 2) };
}

/** Every equation of the grid: even rows (top → bottom), then even columns (left → right). */
export function equationsOf(payload: Pick<CrossMathPayload, 'rows' | 'cols' | 'cells'>) {
  const list: Equation[] = [];
  for (let r = 0; r < payload.rows; r += 2) {
    const eq = lineEquation(payload.cells, 'row', r);
    if (eq) list.push(eq);
  }
  for (let c = 0; c < payload.cols; c += 2) {
    const eq = lineEquation(payload.cells, 'col', c);
    if (eq) list.push(eq);
  }
  return list;
}

/** Blank cells `[row, col]`, row-major (the order of the draft's slots). */
export function blanksOf(payload: Pick<CrossMathPayload, 'cells'>): [number, number][] {
  const list: [number, number][] = [];
  payload.cells.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === '?') list.push([r, c]);
    }),
  );
  return list;
}

export function isCrossMathPayload(value: unknown): value is CrossMathPayload {
  const v = value as CrossMathPayload | null;
  if (typeof v !== 'object' || v === null) return false;
  const { rows, cols, cells, bank } = v;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return false;
  if (rows < MIN_SIDE || cols < MIN_SIDE || rows > MAX_SIDE || cols > MAX_SIDE) return false;
  if (rows % 2 === 0 || cols % 2 === 0) return false;
  if (!Array.isArray(cells) || cells.length !== rows) return false;
  for (let r = 0; r < rows; r++) {
    const row = cells[r];
    if (!Array.isArray(row) || row.length !== cols) return false;
    for (let c = 0; c < cols; c++) {
      const cell = row[c];
      if (!isCell(cell)) return false;
      const even = r % 2 === 0 && c % 2 === 0;
      const odd = r % 2 === 1 && c % 2 === 1;
      // Lattice: numbers only on even/even, nothing on odd/odd, operators in between.
      if (even && !isNumberCell(cell)) return false;
      if (odd && cell !== null) return false;
      if (!even && !odd && isNumberCell(cell)) return false;
    }
  }
  if (!Array.isArray(bank) || !bank.every(isWhole)) return false;
  const blanks = blanksOf(v).length;
  if (blanks < 1 || bank.length !== blanks) return false;
  return equationsOf(v).length > 0;
}

/** Display glyph of an operator. */
export function operatorGlyph(op: CrossMathOperator): string {
  switch (op) {
    case '*':
      return '×';
    case '/':
      return '÷';
    case '-':
      return '−';
    default:
      return op;
  }
}

/**
 * Value of `a op b op c …` with normal precedence (× and ÷ first, then + and − left to right).
 * Null when a division is by zero or not exact (the contract's puzzles only use exact ones).
 */
export function evaluate(nums: readonly number[], ops: readonly MathOp[]): number | null {
  if (nums.length === 0 || ops.length !== nums.length - 1) return null;
  // First pass: fold × and ÷ into terms.
  const terms: number[] = [nums[0]];
  const signs: ('+' | '-')[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const next = nums[i + 1];
    if (op === '*' || op === '/') {
      const last = terms[terms.length - 1];
      if (op === '*') terms[terms.length - 1] = last * next;
      else {
        if (next === 0 || last % next !== 0) return null;
        terms[terms.length - 1] = last / next;
      }
    } else {
      signs.push(op);
      terms.push(next);
    }
  }
  let total = terms[0];
  for (let i = 0; i < signs.length; i++) {
    total = signs[i] === '+' ? total + terms[i + 1] : total - terms[i + 1];
  }
  return total;
}

/** Current number of every cell: givens, placed tiles, or null for an empty blank. */
export type ValueGrid = (number | null)[][];

/** Values of the grid with the blanks filled from `placed` (a bank index per blank, or null). */
export function valueGrid(
  payload: CrossMathPayload,
  placed: readonly (number | null)[],
): ValueGrid {
  const blanks = blanksOf(payload);
  const grid: ValueGrid = payload.cells.map((row) =>
    row.map((v) => (typeof v === 'number' ? v : null)),
  );
  blanks.forEach(([r, c], k) => {
    const tile = placed[k];
    grid[r][c] = tile === null || tile === undefined ? null : (payload.bank[tile] ?? null);
  });
  return grid;
}

export type EquationState = 'open' | 'true' | 'false';

/** `open` while a number is missing, else whether `left = result` holds. */
export function equationState(eq: Equation, grid: ValueGrid): EquationState {
  const values = eq.cells.map(([r, c]) => grid[r][c]);
  if (values.some((v) => v === null)) return 'open';
  const nums = values as number[];
  const left = evaluate(nums.slice(0, -1), eq.ops);
  return left !== null && left === nums[nums.length - 1] ? 'true' : 'false';
}

/** True when every blank is filled and every equation holds (what the server checks). */
export function isSolved(payload: CrossMathPayload, placed: readonly (number | null)[]): boolean {
  const blanks = blanksOf(payload);
  if (placed.length !== blanks.length || placed.some((p) => p === null)) return false;
  // Each bank tile used exactly once (same multiset as `bank`).
  if (new Set(placed).size !== placed.length) return false;
  const grid = valueGrid(payload, placed);
  return equationsOf(payload).every((eq) => equationState(eq, grid) === 'true');
}

// ---------------------------------------------------------------------------
// Placing tiles (tap a tile, then a blank; tap a filled blank to send its tile back)
// ---------------------------------------------------------------------------

export interface CrossMathDraft {
  /** Bank index placed on each blank (row-major blanks), or null. */
  placed: (number | null)[];
}

export function emptyDraft(blankCount: number): CrossMathDraft {
  return { placed: new Array<number | null>(blankCount).fill(null) };
}

export function isCrossMathDraft(
  value: unknown,
  blankCount: number,
  bankSize: number,
): value is CrossMathDraft {
  const d = value as CrossMathDraft | null;
  if (typeof d !== 'object' || d === null || !Array.isArray(d.placed)) return false;
  if (d.placed.length !== blankCount) return false;
  const used = d.placed.filter((p) => p !== null);
  return (
    used.every((p) => Number.isInteger(p) && (p as number) >= 0 && (p as number) < bankSize) &&
    new Set(used).size === used.length
  );
}

/** Bank indexes currently on the board. */
export function usedTiles(placed: readonly (number | null)[]): Set<number> {
  return new Set(placed.filter((p): p is number => p !== null));
}

/** Puts tile `tile` on blank `slot` (moving it from another blank if it was placed). */
export function placeTile(
  placed: readonly (number | null)[],
  slot: number,
  tile: number,
): (number | null)[] {
  const next = placed.map((p) => (p === tile ? null : p));
  next[slot] = tile;
  return next;
}

/** Sends the tile on `slot` back to the bank. */
export function clearSlot(placed: readonly (number | null)[], slot: number): (number | null)[] {
  const next = [...placed];
  next[slot] = null;
  return next;
}

/** The first free tile with the given value (for keyboard entry), else null. */
export function freeTileWithValue(
  bank: readonly number[],
  placed: readonly (number | null)[],
  value: number,
): number | null {
  const used = usedTiles(placed);
  const i = bank.findIndex((v, k) => v === value && !used.has(k));
  return i < 0 ? null : i;
}

/** The `{ fills }` to submit: `[row, col, value]` per filled blank. */
export function toFills(
  payload: CrossMathPayload,
  placed: readonly (number | null)[],
): CrossMathFill[] {
  const fills: CrossMathFill[] = [];
  blanksOf(payload).forEach(([r, c], k) => {
    const tile = placed[k];
    if (tile !== null && tile !== undefined) fills.push([r, c, payload.bank[tile]]);
  });
  return fills;
}

/** `{ fills }` (response or correct_response) as a grid of values (null where absent). */
export function readFills(value: unknown, rows: number, cols: number): ValueGrid | null {
  const fills =
    typeof value === 'object' && value !== null && 'fills' in value
      ? (value as { fills: unknown }).fills
      : null;
  if (!Array.isArray(fills)) return null;
  const grid: ValueGrid = Array.from({ length: rows }, () => new Array(cols).fill(null));
  for (const f of fills) {
    if (!Array.isArray(f) || f.length !== 3 || !f.every((n) => Number.isInteger(n))) return null;
    const [r, c, v] = f as number[];
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    grid[r][c] = v;
  }
  return grid;
}

/** Track widths of the lattice: number columns get 1, operator columns `opRatio`. */
export function trackSizes(count: number, unit: number, opRatio: number): number[] {
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? unit : unit * opRatio));
}

/** Number-cell size so `count` tracks (alternating number / operator) fit `width`. */
export function unitFor(count: number, width: number, opRatio: number): number {
  const numbers = Math.ceil(count / 2);
  const ops = Math.floor(count / 2);
  return width / (numbers + ops * opRatio);
}
