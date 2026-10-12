import type { SudokuPayload } from '@/api/types';

/**
 * Pure Sudoku helpers. The app never knows the solution: it only applies the rules locally
 * (duplicates in a row, column or box) and the server verifies the submitted grid.
 * Cells are addressed by a flat index `row * size + col`.
 */

const SIZES = [4, 6, 9] as const;

function isIntGrid(grid: unknown, size: number, max: number): grid is number[][] {
  return (
    Array.isArray(grid) &&
    grid.length === size &&
    grid.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size &&
        row.every((v) => Number.isInteger(v) && v >= 0 && v <= max),
    )
  );
}

export function isSudokuPayload(value: unknown): value is SudokuPayload {
  const v = value as SudokuPayload | null;
  if (typeof v !== 'object' || v === null) return false;
  if (!(SIZES as readonly number[]).includes(v.size)) return false;
  const box = v.box;
  if (
    !Array.isArray(box) ||
    box.length !== 2 ||
    !box.every((n) => Number.isInteger(n) && n > 0) ||
    box[0] * box[1] !== v.size
  )
    return false;
  return isIntGrid(v.grid, v.size, v.size);
}

/** A `{ grid }` response of the given size (used for `correct_response` and drafts). */
export function readGrid(value: unknown, size: number): number[][] | null {
  const grid =
    typeof value === 'object' && value !== null && 'grid' in value
      ? (value as { grid: unknown }).grid
      : null;
  return isIntGrid(grid, size, size) ? grid : null;
}

export const flatten = (grid: number[][]): number[] => grid.flat();

export function toGrid(values: number[], size: number): number[][] {
  return Array.from({ length: size }, (_, r) => values.slice(r * size, r * size + size));
}

export function boxOf(index: number, size: number, box: [number, number]): number {
  const row = Math.floor(index / size);
  const col = index % size;
  const boxesPerRow = size / box[1];
  return Math.floor(row / box[0]) * boxesPerRow + Math.floor(col / box[1]);
}

/** Indices of cells whose value appears more than once in their row, column or box. */
export function findConflicts(values: number[], size: number, box: [number, number]): Set<number> {
  const out = new Set<number>();
  const groups = new Map<string, number[]>();
  values.forEach((v, i) => {
    if (!v) return;
    const keys = [
      `r${Math.floor(i / size)}:${v}`,
      `c${i % size}:${v}`,
      `b${boxOf(i, size, box)}:${v}`,
    ];
    for (const k of keys) {
      const list = groups.get(k);
      if (list) list.push(i);
      else groups.set(k, [i]);
    }
  });
  for (const list of groups.values()) if (list.length > 1) list.forEach((i) => out.add(i));
  return out;
}

export function isFull(values: number[]): boolean {
  return values.every((v) => v > 0);
}

/** True when `a` and `b` share a row, column or box. */
export function isPeer(a: number, b: number, size: number, box: [number, number]): boolean {
  return (
    Math.floor(a / size) === Math.floor(b / size) ||
    a % size === b % size ||
    boxOf(a, size, box) === boxOf(b, size, box)
  );
}

/** How often each digit 1..size is placed (index = digit). */
export function digitCounts(values: number[], size: number): number[] {
  const counts = new Array<number>(size + 1).fill(0);
  for (const v of values) if (v) counts[v] += 1;
  return counts;
}

export const toggleNote = (mask: number, digit: number): number => mask ^ (1 << digit);
export const hasNote = (mask: number, digit: number): boolean => (mask & (1 << digit)) !== 0;
