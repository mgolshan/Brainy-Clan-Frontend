import type {
  AnagramPayload,
  GridCell,
  MissingLetterPayload,
  WordPlacement,
  WordPuzzlePayload,
  WordSearchPayload,
} from '@/api/types';

/** Word puzzle helpers (`anagram`, `missing_letter`, `word_search`); pure, no React. */

const isLetters = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every((l) => typeof l === 'string' && l.length > 0);

const isHint = (v: unknown) => v == null || typeof v === 'string';

export function isAnagramPayload(v: Partial<AnagramPayload>): v is AnagramPayload {
  return v.variant === 'anagram' && isLetters(v.letters) && isHint(v.hint);
}

export function isMissingLetterPayload(
  v: Partial<MissingLetterPayload>,
): v is MissingLetterPayload {
  return (
    v.variant === 'missing_letter' &&
    typeof v.pattern === 'string' &&
    v.pattern.includes('_') &&
    isHint(v.hint)
  );
}

export function isWordSearchPayload(v: Partial<WordSearchPayload>): v is WordSearchPayload {
  if (v.variant !== 'word_search' || !Array.isArray(v.grid) || v.grid.length === 0) return false;
  const cols = Array.isArray(v.grid[0]) ? v.grid[0].length : 0;
  return (
    cols > 0 && v.grid.every((row) => isLetters(row) && row.length === cols) && isLetters(v.words)
  );
}

export function isWordPuzzlePayload(value: unknown): value is WordPuzzlePayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<WordPuzzlePayload>;
  return (
    isAnagramPayload(v as Partial<AnagramPayload>) ||
    isMissingLetterPayload(v as Partial<MissingLetterPayload>) ||
    isWordSearchPayload(v as Partial<WordSearchPayload>)
  );
}

/** `{ word }` from a response / correct_response. */
export function readWord(value: unknown): string | null {
  return typeof value === 'object' && value !== null && 'word' in value
    ? String((value as { word: unknown }).word)
    : null;
}

const isCell = (v: unknown): v is GridCell =>
  Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n >= 0);

export function isPlacement(v: unknown): v is WordPlacement {
  const p = v as WordPlacement | null;
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.word === 'string' &&
    isCell(p.start) &&
    isCell(p.end)
  );
}

/** `{ found: [...] }` from a response / correct_response. */
export function readFound(value: unknown): WordPlacement[] {
  const found =
    typeof value === 'object' && value !== null && 'found' in value
      ? (value as { found: unknown }).found
      : null;
  return Array.isArray(found) ? found.filter(isPlacement) : [];
}

/**
 * Compare form of a word, like the server (API.md: NFC-normalized, case-insensitive), so a
 * decomposed accent ("e" + U+0301) matches a precomposed "É".
 */
export const normalizeWord = (w: string) => w.normalize('NFC').trim().toLocaleUpperCase();

/** Cells from start to end if they form a straight line in one of the 8 directions. */
export function lineCells(start: GridCell, end: GridCell): GridCell[] | null {
  const dr = end[0] - start[0];
  const dc = end[1] - start[1];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  return Array.from({ length: steps + 1 }, (_, i) => [start[0] + sr * i, start[1] + sc * i]);
}

/**
 * Snap a dragged-to cell onto the nearest of the 8 directions from `start`, clipped to the grid
 * (so a slightly crooked drag still selects a straight line).
 */
export function snapToLine(
  start: GridCell,
  target: GridCell,
  rows: number,
  cols: number,
): GridCell {
  const dr = target[0] - start[0];
  const dc = target[1] - start[1];
  if (dr === 0 && dc === 0) return start;
  const angle = Math.atan2(dr, dc);
  const octant = Math.round(angle / (Math.PI / 4));
  const sr = Math.round(Math.sin((octant * Math.PI) / 4));
  const sc = Math.round(Math.cos((octant * Math.PI) / 4));
  let len = Math.max(Math.abs(dr), Math.abs(dc));
  // Clip to the grid.
  while (len > 0) {
    const r = start[0] + sr * len;
    const c = start[1] + sc * len;
    if (r >= 0 && r < rows && c >= 0 && c < cols) break;
    len -= 1;
  }
  return [start[0] + sr * len, start[1] + sc * len];
}

/**
 * The word a selection spells, matched against the words still to find (either reading
 * direction). Returns the placement oriented the way the word reads, or null.
 */
export function matchSelection(
  grid: string[][],
  start: GridCell,
  end: GridCell,
  remaining: string[],
): WordPlacement | null {
  const cells = lineCells(start, end);
  if (!cells || cells.length < 2) return null;
  const letters = cells.map(([r, c]) => grid[r]?.[c] ?? '');
  const forward = normalizeWord(letters.join(''));
  const backward = normalizeWord([...letters].reverse().join(''));
  for (const word of remaining) {
    const w = normalizeWord(word);
    if (w === forward) return { word, start, end };
    if (w === backward) return { word, start: end, end: start };
  }
  return null;
}

/** Fisher–Yates shuffle of indices 0..n-1 that differs from the current order when possible. */
export function shuffledOrder(current: number[]): number[] {
  if (current.length < 2) return current;
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = [...current];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.some((v, i) => v !== current[i])) return next;
  }
  return current;
}
