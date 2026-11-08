import type { GridCell, MazePayload } from '@/api/types';
import {
  canStep,
  collectedStars,
  compactPath,
  isMazePayload,
  isMazeSolved,
  isValidPath,
  keyDirection,
  maxPathLength,
  move,
  neighbour,
  openDirections,
  pathPoints,
  readPath,
  run,
  shortestRoute,
  swipeDirection,
  walkTo,
  wallSegments,
} from '@/challenges/maze/logic';
import { sampleMaze, shortestTour } from '@/features/dev/puzzleSamples';

/**
 * 3×3 perfect maze (1 N, 2 E, 4 S, 8 W):
 *
 *   S → →  ·
 *   ┌─────┐ ↓
 *   ·  ← ←
 *   ↓
 *   · → → G
 */
const M: MazePayload = {
  rows: 3,
  cols: 3,
  cells: [
    [1 | 8 | 4, 1 | 4, 1 | 2],
    [8 | 1, 1 | 4, 2 | 4],
    [8 | 4, 4 | 1, 4 | 2 | 1],
  ],
  start: [0, 0],
  goal: [2, 2],
  stars: [[1, 0]],
};
const ROUTE: GridCell[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 1],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
];

describe('isMazePayload', () => {
  it('accepts the contract shape', () => {
    expect(isMazePayload(M)).toBe(true);
    expect(isMazePayload(sampleMaze(16, 4, 3))).toBe(true);
  });

  it.each([
    ['null', null],
    ['start out of range', { ...M, start: [3, 0] }],
    ['goal not a pair', { ...M, goal: [1] }],
    ['wall mask > 15', { ...M, cells: [[16, 5, 3], ...M.cells.slice(1)] }],
    ['ragged rows', { ...M, cells: [[13, 5], ...M.cells.slice(1)] }],
    ['star out of range', { ...M, stars: [[0, 9]] }],
    ['too small', { ...M, rows: 1, cells: [M.cells[0]] }],
  ])('rejects %s', (_label, payload) => {
    expect(isMazePayload(payload)).toBe(false);
  });
});

describe('walls', () => {
  it('blocks steps through walls (either side) and off the board', () => {
    expect(neighbour(M, [0, 0], 'right')).toEqual([0, 1]);
    expect(neighbour(M, [0, 0], 'down')).toBeNull();
    expect(neighbour(M, [0, 0], 'up')).toBeNull();
    expect(neighbour(M, [0, 0], 'left')).toBeNull();
    // A wall on one side only still blocks (the server could refuse the step).
    const oneSided: MazePayload = { ...M, cells: M.cells.map((r) => [...r]) };
    oneSided.cells[0][1] &= ~4; // (0,1) says open to the south, (1,1) still has its north wall
    expect(neighbour(oneSided, [0, 1], 'down')).toBeNull();
  });

  it('checks single steps like the server', () => {
    expect(canStep(M, [0, 0], [0, 1])).toBe(true);
    expect(canStep(M, [0, 0], [1, 0])).toBe(false); // wall
    expect(canStep(M, [0, 0], [0, 2])).toBe(false); // not a neighbour
    expect(canStep(M, [0, 0], [1, 1])).toBe(false); // diagonal
    expect(openDirections(M, [1, 1])).toEqual(['right', 'left']);
  });

  it('draws each wall once, including the border', () => {
    const segs = wallSegments(M);
    const key = (s: number[]) => s.join(',');
    expect(new Set(segs.map(key)).size).toBe(segs.length);
    // Outer border: 4 sides × 3 cells.
    const border = segs.filter(
      ([x1, y1, x2, y2]) =>
        (y1 === 0 && y2 === 0) ||
        (y1 === 3 && y2 === 3) ||
        (x1 === 0 && x2 === 0) ||
        (x1 === 3 && x2 === 3),
    );
    expect(border).toHaveLength(12);
    expect(
      pathPoints(
        [
          [0, 0],
          [0, 1],
        ],
        10,
        2,
      ),
    ).toBe('7,7 17,7');
  });
});

describe('moves', () => {
  it('walks, refuses walls and keeps revisits', () => {
    let path: GridCell[] = [M.start];
    const blocked = move(M, path, 'down');
    expect(blocked.entered).toEqual([]);
    expect(blocked.path).toEqual(path);
    path = move(M, path, 'right').path;
    path = move(M, path, 'left').path;
    expect(path).toEqual([
      [0, 0],
      [0, 1],
      [0, 0],
    ]);
    expect(isValidPath(M, path)).toBe(true);
  });

  it('runs along a corridor to the next stop (turn, star or goal)', () => {
    const first = run(M, [M.start], 'right');
    expect(first.entered).toEqual([
      [0, 1],
      [0, 2],
    ]);
    // From (1,2) going left the run stops on the star at (1,0).
    const second = run(M, [...ROUTE.slice(0, 4)], 'left');
    expect(second.entered).toEqual([
      [1, 1],
      [1, 0],
    ]);
  });

  it('follows a finger along a straight open line only', () => {
    expect(walkTo(M, [M.start], [0, 2]).entered).toHaveLength(2);
    expect(walkTo(M, [M.start], [1, 0]).entered).toHaveLength(0); // wall
    expect(walkTo(M, [M.start], [1, 1]).entered).toHaveLength(0); // diagonal
    expect(walkTo(M, [M.start], [0, 0]).entered).toHaveLength(0);
  });

  it('reads swipes and keys', () => {
    expect(swipeDirection(40, 5)).toBe('right');
    expect(swipeDirection(-3, -40)).toBe('up');
    expect(swipeDirection(4, 3)).toBeNull();
    expect(keyDirection('ArrowLeft')).toBe('left');
    expect(keyDirection('s')).toBe('down');
    expect(keyDirection('Enter')).toBeNull();
  });
});

describe('solving', () => {
  it('needs the goal and every star', () => {
    expect(isMazeSolved(M, ROUTE)).toBe(true);
    expect(collectedStars(M, ROUTE)).toEqual([true]);
    // Ends early.
    expect(isMazeSolved(M, ROUTE.slice(0, 6))).toBe(false);
    // Every star counts.
    expect(
      isMazeSolved(
        {
          ...M,
          stars: [
            [1, 0],
            [2, 1],
          ],
        },
        ROUTE,
      ),
    ).toBe(true);
    expect(
      collectedStars(
        {
          ...M,
          stars: [
            [1, 0],
            [0, 0],
          ],
        },
        ROUTE.slice(0, 3),
      ),
    ).toEqual([false, true]);
  });

  it('rejects paths the server would refuse', () => {
    expect(isValidPath(M, [[0, 1]])).toBe(false); // not at start
    expect(
      isValidPath(M, [
        [0, 0],
        [1, 0],
      ]),
    ).toBe(false); // through a wall
    expect(
      isValidPath(M, [
        [0, 0],
        [0, 9],
      ]),
    ).toBe(false); // out of range
    expect(isValidPath(M, [])).toBe(false);
    const long = Array.from({ length: maxPathLength(M) + 1 }, (_, i) =>
      i % 2 ? ([0, 1] as GridCell) : ([0, 0] as GridCell),
    );
    expect(isValidPath(M, long)).toBe(false);
  });

  it('compacts a long wandering path without losing stars', () => {
    const wander: GridCell[] = [M.start];
    for (let i = 0; i < 10; i++) wander.push([0, 1], [0, 0]);
    const withStar = [...wander, ...ROUTE.slice(1, 6)];
    const compact = compactPath(M, withStar);
    expect(compact).toEqual(ROUTE.slice(0, 6));
    expect(collectedStars(M, compact)).toEqual([true]);
    expect(isValidPath(M, compact)).toBe(true);
  });

  it('compacts automatically when the path would get too long', () => {
    let path: GridCell[] = [M.start];
    for (let i = 0; i < maxPathLength(M) + 5; i++) {
      path = move(M, path, i % 2 ? 'left' : 'right').path;
    }
    expect(path.length).toBeLessThanOrEqual(maxPathLength(M));
    expect(isValidPath(M, path)).toBe(true);
  });

  it('finds shortest routes (BFS) and tours', () => {
    expect(shortestRoute(M, [0, 0], [2, 2])).toEqual(ROUTE);
    expect(shortestTour(M)).toEqual(ROUTE);
  });

  it('reads a submitted path', () => {
    expect(readPath({ path: ROUTE }, 3, 3)).toEqual(ROUTE);
    expect(readPath({ path: [[0, 5]] }, 3, 3)).toBeNull();
    expect(readPath(null, 3, 3)).toBeNull();
  });
});

describe('sample mazes', () => {
  it.each([5, 10, 16])('%d×%d is a perfect maze with a reachable goal', (size) => {
    const m = sampleMaze(size, 4, size);
    expect(isMazePayload(m)).toBe(true);
    // Perfect: n - 1 passages (a tree).
    let passages = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (neighbour(m, [r, c], 'right')) passages++;
        if (neighbour(m, [r, c], 'down')) passages++;
      }
    }
    expect(passages).toBe(size * size - 1);
    expect(isMazeSolved(m, shortestTour(m))).toBe(true);
  });
});
