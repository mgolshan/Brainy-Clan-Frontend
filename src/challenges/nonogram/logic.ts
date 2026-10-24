import type { NonogramPayload } from '@/api/types';

/**
 * Pure nonogram helpers. The app never knows the solution: it only compares each line with its
 * clue (the same check a player does by eye) and the server verifies the submitted grid.
 * Cells are addressed by a flat index `row * cols + col`; a cell is EMPTY, FILLED or MARKED
 * (✕, a local note that is sent as empty).
 */

export const EMPTY = 0;
export const FILLED = 1;
export const MARKED = 2;
export type CellState = typeof EMPTY | typeof FILLED | typeof MARKED;

const MAX_SIDE = 20;

/** A clue line: positive run lengths, or `[]` / `[0]` for an empty line. */
function isClue(clue: unknown, length: number): clue is number[] {
  if (!Array.isArray(clue)) return false;
  if (!clue.every((n) => Number.isInteger(n) && n >= 0 && n <= length)) return false;
  const runs = normalizeClue(clue);
  if (runs.length !== clue.length && !(clue.length === 1 && clue[0] === 0)) return false;
  // Runs plus the gaps between them must fit the line.
  return runs.reduce((sum, n) => sum + n, 0) + Math.max(0, runs.length - 1) <= length;
}

export function isNonogramPayload(value: unknown): value is NonogramPayload {
  const v = value as NonogramPayload | null;
  if (typeof v !== 'object' || v === null) return false;
  const { rows, cols, row_clues: rowClues, col_clues: colClues } = v;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return false;
  if (rows < 1 || cols < 1 || rows > MAX_SIDE || cols > MAX_SIDE) return false;
  if (!Array.isArray(rowClues) || rowClues.length !== rows) return false;
  if (!Array.isArray(colClues) || colClues.length !== cols) return false;
  return rowClues.every((c) => isClue(c, cols)) && colClues.every((c) => isClue(c, rows));
}

/** The clue without zero entries (`[0]` = empty line → `[]`). */
export function normalizeClue(clue: readonly number[]): number[] {
  return clue.filter((n) => n > 0);
}

/** Lengths of the filled runs of a line (marks count as empty). */
export function lineRuns(line: readonly number[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell === FILLED) run++;
    else if (run) {
      runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs;
}

/** True when the filled cells of the line match its clue exactly. */
export function isLineSatisfied(line: readonly number[], clue: readonly number[]): boolean {
  const runs = lineRuns(line);
  const want = normalizeClue(clue);
  return runs.length === want.length && runs.every((n, i) => n === want[i]);
}

export function rowOf(cells: readonly number[], cols: number, r: number): number[] {
  return cells.slice(r * cols, r * cols + cols);
}

export function colOf(cells: readonly number[], rows: number, cols: number, c: number): number[] {
  return Array.from({ length: rows }, (_, r) => cells[r * cols + c]);
}

/** Which rows and columns currently match their clues. */
export function satisfiedLines(
  cells: readonly number[],
  payload: NonogramPayload,
): { rows: boolean[]; cols: boolean[] } {
  const { rows, cols, row_clues: rowClues, col_clues: colClues } = payload;
  return {
    rows: rowClues.map((clue, r) => isLineSatisfied(rowOf(cells, cols, r), clue)),
    cols: colClues.map((clue, c) => isLineSatisfied(colOf(cells, rows, cols, c), clue)),
  };
}

/** The `{ grid }` to submit: 1 = filled, 0 = everything else (marks are local only). */
export function toResponseGrid(cells: readonly number[], rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, (_, r) =>
    rowOf(cells, cols, r).map((cell) => (cell === FILLED ? 1 : 0)),
  );
}

/** A 0/1 `{ grid }` of the given size (response, correct_response), flattened; else null. */
export function readNonogramGrid(value: unknown, rows: number, cols: number): number[] | null {
  const grid =
    typeof value === 'object' && value !== null && 'grid' in value
      ? (value as { grid: unknown }).grid
      : null;
  if (
    !Array.isArray(grid) ||
    grid.length !== rows ||
    !grid.every(
      (row) => Array.isArray(row) && row.length === cols && row.every((v) => v === 0 || v === 1),
    )
  )
    return null;
  return (grid as number[][]).flat();
}

/** The picture's localized name from `correct_response.title`, else null. */
export function readNonogramTitle(value: unknown): string | null {
  const title =
    typeof value === 'object' && value !== null && 'title' in value
      ? (value as { title: unknown }).title
      : null;
  return typeof title === 'string' && title.trim() ? title.trim() : null;
}

/** Next state of a tapped cell: fill mode toggles filled, mark mode toggles ✕. */
export function toggleCell(state: number, mode: 'fill' | 'mark'): CellState {
  if (mode === 'fill') return state === FILLED ? EMPTY : FILLED;
  return state === MARKED ? EMPTY : MARKED;
}

/** Longest clue (number count) of a set of clues, at least 1 (for the clue area size). */
export function longestClue(clues: readonly (readonly number[])[]): number {
  return Math.max(1, ...clues.map((c) => normalizeClue(c).length));
}
