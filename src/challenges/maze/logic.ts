import type { GridCell, MazePayload } from '@/api/types';

/**
 * Pure maze rules (API.md "Level-up puzzles"). `cells[r][c]` is a wall bitmask: 1 north, 2 east,
 * 4 south, 8 west. The member walks from `start`; each step goes to an orthogonal neighbour with
 * no wall between them (a wall on either side blocks, so the app never sends a step the server
 * could refuse). Correct when the path ends on `goal` after visiting every star. The path may
 * revisit cells but has at most `rows × cols × 4` entries.
 */

export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

export type Direction = 'up' | 'right' | 'down' | 'left';

export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

const STEP: Record<Direction, { dr: number; dc: number; wall: number; back: number }> = {
  up: { dr: -1, dc: 0, wall: NORTH, back: SOUTH },
  right: { dr: 0, dc: 1, wall: EAST, back: WEST },
  down: { dr: 1, dc: 0, wall: SOUTH, back: NORTH },
  left: { dr: 0, dc: -1, wall: WEST, back: EAST },
};

/** Generous bounds around the contract's 5×5 → 16×16 and 0–4 stars. */
const MAX_SIDE = 30;
const MAX_STARS = 10;

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function isCellIn(v: unknown, rows: number, cols: number): v is GridCell {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    isInt(v[0]) &&
    isInt(v[1]) &&
    v[0] >= 0 &&
    v[1] >= 0 &&
    v[0] < rows &&
    v[1] < cols
  );
}

export function isMazePayload(value: unknown): value is MazePayload {
  const v = value as MazePayload | null;
  if (typeof v !== 'object' || v === null) return false;
  const { rows, cols, cells, start, goal, stars } = v;
  if (!isInt(rows) || !isInt(cols) || rows < 2 || cols < 2) return false;
  if (rows > MAX_SIDE || cols > MAX_SIDE) return false;
  if (!Array.isArray(cells) || cells.length !== rows) return false;
  if (
    !cells.every(
      (row) =>
        Array.isArray(row) &&
        row.length === cols &&
        row.every((w) => isInt(w) && w >= 0 && w <= 15),
    )
  )
    return false;
  if (!isCellIn(start, rows, cols) || !isCellIn(goal, rows, cols)) return false;
  if (!Array.isArray(stars) || stars.length > MAX_STARS) return false;
  return stars.every((s) => isCellIn(s, rows, cols));
}

export const sameCell = (a: GridCell, b: GridCell) => a[0] === b[0] && a[1] === b[1];
export const cellKey = (cell: GridCell) => `${cell[0]},${cell[1]}`;

function inside(payload: Pick<MazePayload, 'rows' | 'cols'>, r: number, c: number) {
  return r >= 0 && c >= 0 && r < payload.rows && c < payload.cols;
}

/** The neighbour in `dir` when no wall is between them, else null. */
export function neighbour(
  payload: Pick<MazePayload, 'rows' | 'cols' | 'cells'>,
  from: GridCell,
  dir: Direction,
): GridCell | null {
  const s = STEP[dir];
  const r = from[0] + s.dr;
  const c = from[1] + s.dc;
  if (!inside(payload, r, c)) return null;
  if (payload.cells[from[0]][from[1]] & s.wall) return null;
  if (payload.cells[r][c] & s.back) return null;
  return [r, c];
}

/** Direction from `a` to the orthogonal neighbour `b`, else null. */
export function directionTo(a: GridCell, b: GridCell): Direction | null {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  if (Math.abs(dr) + Math.abs(dc) !== 1) return null;
  if (dr === -1) return 'up';
  if (dr === 1) return 'down';
  return dc === 1 ? 'right' : 'left';
}

/** True when one step from `a` to `b` is allowed (orthogonal neighbour, no wall). */
export function canStep(payload: MazePayload, a: GridCell, b: GridCell): boolean {
  const dir = directionTo(a, b);
  const next = dir ? neighbour(payload, a, dir) : null;
  return !!next && sameCell(next, b);
}

/** Open directions out of a cell. */
export function openDirections(payload: MazePayload, cell: GridCell): Direction[] {
  return DIRECTIONS.filter((d) => neighbour(payload, cell, d) !== null);
}

export function maxPathLength(payload: Pick<MazePayload, 'rows' | 'cols'>): number {
  return payload.rows * payload.cols * 4;
}

/** Mirrors the server's checks on a submitted path (422 cases → false). */
export function isValidPath(payload: MazePayload, path: readonly GridCell[]): boolean {
  if (path.length < 1 || path.length > maxPathLength(payload)) return false;
  if (!path.every((p) => isCellIn(p, payload.rows, payload.cols))) return false;
  if (!sameCell(path[0], payload.start)) return false;
  for (let i = 1; i < path.length; i++) {
    if (!canStep(payload, path[i - 1], path[i])) return false;
  }
  return true;
}

/** Stars (indexes into `payload.stars`) visited by the path. */
export function collectedStars(payload: MazePayload, path: readonly GridCell[]): boolean[] {
  const seen = new Set(path.map(cellKey));
  return payload.stars.map((s) => seen.has(cellKey(s)));
}

/** Correct by the contract: valid, ends on the goal, every star visited. */
export function isMazeSolved(payload: MazePayload, path: readonly GridCell[]): boolean {
  return (
    isValidPath(payload, path) &&
    sameCell(path[path.length - 1], payload.goal) &&
    collectedStars(payload, path).every(Boolean)
  );
}

/** Shortest route from `a` to `b` (inclusive), null when unreachable. BFS over open walls. */
export function shortestRoute(payload: MazePayload, a: GridCell, b: GridCell): GridCell[] | null {
  const prev = new Map<string, GridCell | null>([[cellKey(a), null]]);
  const queue: GridCell[] = [a];
  while (queue.length) {
    const cur = queue.shift()!;
    if (sameCell(cur, b)) {
      const route: GridCell[] = [];
      let at: GridCell | null = cur;
      while (at) {
        route.unshift(at);
        at = prev.get(cellKey(at)) ?? null;
      }
      return route;
    }
    for (const d of DIRECTIONS) {
      const n = neighbour(payload, cur, d);
      if (n && !prev.has(cellKey(n))) {
        prev.set(cellKey(n), cur);
        queue.push(n);
      }
    }
  }
  return null;
}

/**
 * Shortens a long path (wandering back and forth) without losing progress: the shortest route
 * through the same milestones (start, each star in the order first reached, the current cell).
 */
export function compactPath(payload: MazePayload, path: readonly GridCell[]): GridCell[] {
  if (path.length === 0) return [];
  const starKeys = new Set(payload.stars.map(cellKey));
  const milestones: GridCell[] = [path[0]];
  const reached = new Set<string>();
  for (const cell of path) {
    const key = cellKey(cell);
    if (starKeys.has(key) && !reached.has(key)) {
      reached.add(key);
      milestones.push(cell);
    }
  }
  milestones.push(path[path.length - 1]);
  const out: GridCell[] = [milestones[0]];
  for (let i = 1; i < milestones.length; i++) {
    const leg = shortestRoute(payload, out[out.length - 1], milestones[i]);
    if (!leg) return [...path];
    out.push(...leg.slice(1));
  }
  return out;
}

export interface MoveResult {
  path: GridCell[];
  /** Cells entered by this move (empty when blocked). */
  entered: GridCell[];
}

/** Appends one step to `path` (compacting a too-long path first); blocked moves return it as is. */
export function appendStep(payload: MazePayload, path: readonly GridCell[], to: GridCell) {
  let base = [...path];
  const from = base[base.length - 1];
  if (!canStep(payload, from, to)) return null;
  if (base.length + 1 > maxPathLength(payload)) {
    base = compactPath(payload, base);
    if (base.length + 1 > maxPathLength(payload)) return null;
  }
  base.push(to);
  return base;
}

/** One step in `dir` from the end of the path. */
export function move(payload: MazePayload, path: readonly GridCell[], dir: Direction): MoveResult {
  const from = path[path.length - 1];
  const to = neighbour(payload, from, dir);
  const next = to ? appendStep(payload, path, to) : null;
  return next ? { path: next, entered: [to!] } : { path: [...path], entered: [] };
}

/**
 * A swipe: keeps walking in `dir` along a corridor and stops at a junction, a turn, a dead end,
 * a star or the goal (so a swipe never runs past something interesting).
 */
export function run(payload: MazePayload, path: readonly GridCell[], dir: Direction): MoveResult {
  let current = [...path];
  const entered: GridCell[] = [];
  const stars = new Set(payload.stars.map(cellKey));
  for (let guard = 0; guard < payload.rows * payload.cols; guard++) {
    const step = move(payload, current, dir);
    if (!step.entered.length) break;
    current = step.path;
    const cell = step.entered[0];
    entered.push(cell);
    if (stars.has(cellKey(cell)) || sameCell(cell, payload.goal)) break;
    // Stop where the corridor branches (more than the way in and the way on).
    if (openDirections(payload, cell).length > 2) break;
  }
  return { path: current, entered };
}

/**
 * Drawing with a finger: walks from the end of the path to `target` when it is a neighbour or
 * further along a straight open line (a fast drag skips cells); anything else is ignored.
 */
export function walkTo(payload: MazePayload, path: readonly GridCell[], target: GridCell) {
  const from = path[path.length - 1];
  const dr = target[0] - from[0];
  const dc = target[1] - from[1];
  if ((dr !== 0 && dc !== 0) || (dr === 0 && dc === 0)) return { path: [...path], entered: [] };
  const dir: Direction = dr < 0 ? 'up' : dr > 0 ? 'down' : dc < 0 ? 'left' : 'right';
  let current = [...path];
  const entered: GridCell[] = [];
  for (let k = 0; k < Math.abs(dr) + Math.abs(dc); k++) {
    const step = move(payload, current, dir);
    if (!step.entered.length) break;
    current = step.path;
    entered.push(step.entered[0]);
  }
  return { path: current, entered };
}

/** Swipe direction from a drag translation (dominant axis), null for a tiny drag. */
export function swipeDirection(dx: number, dy: number, min = 12): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Arrow keys (and WASD) on web. */
export function keyDirection(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

/** A `{ path }` (response or correct_response) of in-range cells, else null. */
export function readPath(value: unknown, rows: number, cols: number): GridCell[] | null {
  const path =
    typeof value === 'object' && value !== null && 'path' in value
      ? (value as { path: unknown }).path
      : null;
  if (!Array.isArray(path) || !path.every((p) => isCellIn(p, rows, cols))) return null;
  return path.map((p) => [p[0], p[1]] as GridCell);
}

/**
 * Wall segments to draw, in cell units: each cell's north and west walls, plus the east wall of
 * the last column and the south wall of the last row (each shared wall drawn once).
 */
export function wallSegments(payload: MazePayload): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const { rows, cols, cells } = payload;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const w = cells[r][c];
      const northWall = w & NORTH || (r > 0 && cells[r - 1][c] & SOUTH) || r === 0;
      const westWall = w & WEST || (c > 0 && cells[r][c - 1] & EAST) || c === 0;
      if (northWall) out.push([c, r, c + 1, r]);
      if (westWall) out.push([c, r, c, r + 1]);
      if (c === cols - 1) out.push([c + 1, r, c + 1, r + 1]);
      if (r === rows - 1) out.push([c, r + 1, c + 1, r + 1]);
    }
  }
  return out;
}

/** SVG path `d` for the wall segments at `cell` px per cell, offset by `pad`. */
export function wallPathData(payload: MazePayload, cell: number, pad: number): string {
  const f = (n: number) => Math.round((n * cell + pad) * 10) / 10;
  return wallSegments(payload)
    .map(([x1, y1, x2, y2]) => `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`)
    .join('');
}

/** SVG polyline points through cell centres. */
export function pathPoints(path: readonly GridCell[], cell: number, pad: number): string {
  const f = (n: number) => Math.round(((n + 0.5) * cell + pad) * 10) / 10;
  return path.map(([r, c]) => `${f(c)},${f(r)}`).join(' ');
}
