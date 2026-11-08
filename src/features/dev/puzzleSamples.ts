import type {
  CodeBreakerPayload,
  CrossMathCell,
  CrossMathFill,
  CrossMathPayload,
  GridCell,
  MazePayload,
  NonogramPayload,
  SessionItem,
  SpotDifferencePayload,
} from '@/api/types';
import { areValidGuesses, gameStatus, readGuesses } from '@/challenges/codebreaker/logic';
import { blanksOf, equationState, equationsOf, readFills } from '@/challenges/crossmath/logic';
import {
  EAST,
  NORTH,
  SOUTH,
  WEST,
  isMazeSolved,
  readPath,
  shortestRoute,
} from '@/challenges/maze/logic';
import { lineRuns, readNonogramGrid, satisfiedLines } from '@/challenges/nonogram/logic';
import { readTaps, scoreTaps } from '@/challenges/spot/logic';
import type { BrainGameSample } from '@/features/dev/brainGameSamples';

/**
 * Nonogram, spot-the-difference and level-up puzzle (Cross Math, Mazes, Code Breaker) samples
 * for `/dev/games`, scored on the device with the same rules as API.md "Brain games" and
 * "Level-up puzzles" (a nonogram is correct when every clue matches; spot the difference when
 * every change is found within `max_misses`; cross math when the fills are the bank and every
 * equation holds; a maze when the path ends on the goal after every star; code breaker when a
 * guess equals the code within `max_guesses`).
 */

function item(id: number, type: string, points: number, payload: unknown): SessionItem {
  return { id, position: -id, type, is_redemption: false, answered: false, points, payload };
}

function nonogramFrom(picture: string[]): { payload: NonogramPayload; solution: number[][] } {
  const solution = picture.map((row) => Array.from(row, (ch) => (ch === '#' ? 1 : 0)));
  const clue = (line: number[]) => {
    const runs = lineRuns(line);
    return runs.length ? runs : [0];
  };
  const cols = solution[0].length;
  return {
    solution,
    payload: {
      rows: solution.length,
      cols,
      row_clues: solution.map(clue),
      col_clues: Array.from({ length: cols }, (_, c) => clue(solution.map((row) => row[c]))),
    },
  };
}

function nonogramSample(
  id: number,
  label: string,
  points: number,
  title: string,
  picture: string[],
): BrainGameSample {
  const { payload, solution } = nonogramFrom(picture);
  return {
    label,
    item: item(id, 'nonogram', points, payload),
    score: (response) => {
      const cells = readNonogramGrid(response, payload.rows, payload.cols);
      const lines = cells ? satisfiedLines(cells, payload) : null;
      return {
        isCorrect: !!lines && [...lines.rows, ...lines.cols].every(Boolean),
        correctResponse: { grid: solution, title },
      };
    },
  };
}

const SPOT: SpotDifferencePayload = {
  aspect: 1.25,
  objects: [
    { id: 'o1', kind: 'sun', x: 0.14, y: 0.13, size: 0.15, color: 'yellow', flip: false },
    { id: 'o2', kind: 'cloud', x: 0.5, y: 0.12, size: 0.18, color: 'white', flip: false },
    { id: 'o3', kind: 'kite', x: 0.84, y: 0.16, size: 0.15, color: 'purple', flip: false },
    { id: 'o4', kind: 'tree', x: 0.16, y: 0.44, size: 0.24, color: 'green', flip: false },
    { id: 'o5', kind: 'house', x: 0.8, y: 0.44, size: 0.24, color: 'blue', flip: false },
    { id: 'o6', kind: 'bird', x: 0.46, y: 0.34, size: 0.1, color: 'red', flip: false },
    { id: 'o7', kind: 'fox', x: 0.38, y: 0.6, size: 0.16, color: 'orange', flip: false },
    { id: 'o8', kind: 'owl', x: 0.6, y: 0.6, size: 0.15, color: 'pink', flip: false },
    { id: 'o9', kind: 'flower', x: 0.1, y: 0.68, size: 0.1, color: 'pink', flip: false },
    { id: 'o10', kind: 'ball', x: 0.84, y: 0.7, size: 0.08, color: 'red', flip: false },
    { id: 'o11', kind: 'rock', x: 0.24, y: 0.72, size: 0.09, color: 'brown', flip: false },
    { id: 'o12', kind: 'star', x: 0.3, y: 0.2, size: 0.07, color: 'yellow', flip: false },
  ],
  changes: [
    { id: 'd1', object_id: 'o3', change: 'color', value: 'green' },
    { id: 'd2', object_id: 'o6', change: 'flip', value: true },
    { id: 'd3', object_id: 'o9', change: 'missing', value: null },
    { id: 'd4', object_id: 'o10', change: 'size', value: 0.13 },
    { id: 'd5', object_id: 'o8', change: 'color', value: 'blue' },
  ],
  max_misses: 5,
};

// --- Cross Math -------------------------------------------------------------

function crossMathSample(
  id: number,
  label: string,
  points: number,
  cells: CrossMathCell[][],
  solution: CrossMathFill[],
): BrainGameSample {
  const payload: CrossMathPayload = {
    rows: cells.length,
    cols: cells[0].length,
    cells,
    bank: solution.map((f) => f[2]).sort((a, b) => a - b),
  };
  return {
    label,
    item: item(id, 'cross_math', points, payload),
    score: (response) => {
      const fills = readFills(response, payload.rows, payload.cols);
      const values = fills ? blanksOf(payload).map(([r, c]) => fills[r][c]) : [];
      const sameBank =
        values.length > 0 &&
        values.every((v) => v !== null) &&
        JSON.stringify([...(values as number[])].sort((a, b) => a - b)) ===
          JSON.stringify(payload.bank);
      const grid = payload.cells.map((row, r) =>
        row.map((v, c) => (typeof v === 'number' ? v : (fills?.[r][c] ?? null))),
      );
      return {
        isCorrect:
          sameBank && equationsOf(payload).every((eq) => equationState(eq, grid) === 'true'),
        correctResponse: { fills: solution },
      };
    },
  };
}

// --- Mazes (seeded perfect maze: recursive backtracker, goal = farthest cell) ------

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS: [number, number, number, number][] = [
  [-1, 0, NORTH, SOUTH],
  [0, 1, EAST, WEST],
  [1, 0, SOUTH, NORTH],
  [0, -1, WEST, EAST],
];

/** A perfect square maze like the server's (start top-left, goal the farthest cell). */
export function sampleMaze(size: number, starCount: number, seed: number): MazePayload {
  const rand = seeded(seed);
  const cells = Array.from({ length: size }, () => new Array<number>(size).fill(15));
  const seen = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const stack: GridCell[] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = DIRS.filter(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr >= 0 && nc >= 0 && nr < size && nc < size && !seen[nr][nc];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dr, dc, wall, back] = options[Math.floor(rand() * options.length)];
    cells[r][c] &= ~wall;
    cells[r + dr][c + dc] &= ~back;
    seen[r + dr][c + dc] = true;
    stack.push([r + dr, c + dc]);
  }
  const base: MazePayload = {
    rows: size,
    cols: size,
    cells,
    start: [0, 0],
    goal: [0, 0],
    stars: [],
  };
  let goal: GridCell = [0, 0];
  let far = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const route = shortestRoute(base, [0, 0], [r, c]);
      if (route && route.length > far) {
        far = route.length;
        goal = [r, c];
      }
    }
  }
  const stars: GridCell[] = [];
  while (stars.length < starCount) {
    const cell: GridCell = [Math.floor(rand() * size), Math.floor(rand() * size)];
    const taken = [[0, 0], goal, ...stars].some((s) => s[0] === cell[0] && s[1] === cell[1]);
    if (!taken) stars.push(cell);
  }
  return { ...base, goal, stars };
}

function permutations<T>(list: T[]): T[][] {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) =>
    permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}

/** Shortest route from the start through every star (any order) to the goal. */
export function shortestTour(payload: MazePayload): GridCell[] {
  let best: GridCell[] | null = null;
  for (const order of permutations(payload.stars)) {
    const stops = [payload.start, ...order, payload.goal];
    const route: GridCell[] = [payload.start];
    for (let i = 1; i < stops.length; i++) {
      route.push(...(shortestRoute(payload, stops[i - 1], stops[i]) ?? []).slice(1));
    }
    if (!best || route.length < best.length) best = route;
  }
  return best ?? [payload.start];
}

function mazeSample(
  id: number,
  label: string,
  points: number,
  payload: MazePayload,
): BrainGameSample {
  return {
    label,
    item: item(id, 'maze', points, payload),
    score: (response) => {
      const path = readPath(response, payload.rows, payload.cols);
      return {
        isCorrect: !!path && isMazeSolved(payload, path),
        correctResponse: { path: shortestTour(payload) },
      };
    },
  };
}

// --- Code Breaker -----------------------------------------------------------

function codeSample(
  id: number,
  label: string,
  points: number,
  payload: CodeBreakerPayload,
): BrainGameSample {
  return {
    label,
    item: item(id, 'code_breaker', points, payload),
    score: (response) => {
      const guesses = readGuesses(response) ?? [];
      return {
        isCorrect: areValidGuesses(payload, guesses) && gameStatus(payload, guesses) === 'solved',
        correctResponse: { guesses: null, code: payload.code },
      };
    },
  };
}

/** Cross Math, Mazes and Code Breaker at a few difficulties (generator settings in API.md). */
export const LEVEL_UP_SAMPLES: BrainGameSample[] = [
  // Difficulty 1: + only, up to 10, 3 blanks.
  crossMathSample(
    -51,
    'cross math 1',
    2,
    [
      [1, '+', 5, '=', 6],
      ['+', null, '+', null, '+'],
      [2, '+', '?', '=', 3],
      ['=', null, '=', null, '='],
      [3, '+', '?', '=', '?'],
    ],
    [
      [2, 2, 1],
      [4, 2, 6],
      [4, 4, 9],
    ],
  ),
  // Difficulty 5: + − ×, up to 50, 6 blanks.
  crossMathSample(
    -52,
    'cross math 5',
    3,
    [
      ['?', '*', '?', '=', 8],
      ['+', null, '*', null, '+'],
      ['?', '*', 3, '=', 9],
      ['=', null, '=', null, '='],
      ['?', '+', '?', '=', '?'],
    ],
    [
      [0, 0, 2],
      [0, 2, 4],
      [2, 0, 3],
      [4, 0, 5],
      [4, 2, 12],
      [4, 4, 17],
    ],
  ),
  // Difficulty 6: + − × ÷, up to 50.
  crossMathSample(
    -53,
    'cross math 6 ÷',
    3,
    [
      [9, '-', '?', '=', '?'],
      ['*', null, '/', null, '+'],
      ['?', '*', 9, '=', '?'],
      ['=', null, '=', null, '='],
      ['?', '/', '?', '=', 45],
    ],
    [
      [0, 2, 9],
      [0, 4, 0],
      [2, 0, 5],
      [2, 4, 45],
      [4, 0, 45],
      [4, 2, 1],
    ],
  ),
  // Difficulty 8: 7×7, + − ×, up to 100, 10 blanks.
  crossMathSample(
    -54,
    'cross math 8 (7×7)',
    5,
    [
      [8, '+', '?', '-', 6, '=', 9],
      ['+', null, '*', null, '+', null, '+'],
      [9, '+', '?', '-', '?', '=', 5],
      ['*', null, '+', null, '-', null, '+'],
      ['?', '*', 4, '-', '?', '=', '?'],
      ['=', null, '=', null, '=', null, '='],
      ['?', '-', '?', '+', '?', '=', '?'],
    ],
    [
      [0, 2, 7],
      [2, 2, 5],
      [2, 4, 9],
      [4, 0, 6],
      [4, 4, 8],
      [4, 6, 16],
      [6, 0, 62],
      [6, 2, 39],
      [6, 4, 7],
      [6, 6, 30],
    ],
  ),
  // Difficulty 1 (5×5, no stars), 6 (10×10, 2 stars), 10 (16×16, 4 stars).
  mazeSample(-55, 'maze 5×5', 1, sampleMaze(5, 0, 1)),
  mazeSample(-56, 'maze 10×10 ★2', 2, sampleMaze(10, 2, 6)),
  mazeSample(-57, 'maze 16×16 ★4', 5, sampleMaze(16, 4, 10)),
  // Difficulty 1 (3 of 4), 6 (4 of 6, repeats), 10 (5 of 8, repeats, 8 guesses).
  codeSample(-58, 'code 3 of 4', 2, {
    pegs: ['fox', 'owl', 'frog', 'panda'],
    length: 3,
    repeats: false,
    max_guesses: 10,
    code: [2, 0, 3],
  }),
  codeSample(-59, 'code 4 of 6 repeats', 3, {
    pegs: ['lion', 'penguin', 'elephant', 'hedgehog', 'octopus', 'monkey'],
    length: 4,
    repeats: true,
    max_guesses: 10,
    code: [4, 1, 1, 5],
  }),
  codeSample(-60, 'code 5 of 8', 5, {
    pegs: ['fox', 'owl', 'panda', 'tiger', 'rabbit', 'frog', 'unicorn', 'dragon'],
    length: 5,
    repeats: true,
    max_guesses: 8,
    code: [6, 2, 7, 2, 0],
  }),
];

export const PUZZLE_SAMPLES: BrainGameSample[] = [
  nonogramSample(-41, 'nonogram 5×5', 3, 'A heart', ['.#.#.', '#####', '#####', '.###.', '..#..']),
  nonogramSample(-42, 'nonogram 10×10', 8, 'A sailing boat', [
    '....#.....',
    '....##....',
    '....###...',
    '....####..',
    '....#####.',
    '....#.....',
    '##########',
    '.########.',
    '..######..',
    '..........',
  ]),
  {
    label: 'spot 5 changes',
    item: item(-43, 'spot_difference', 3, SPOT),
    score: (response) => {
      const { found, misses } = scoreTaps(readTaps(response), SPOT);
      return {
        isCorrect: found.length === SPOT.changes.length && misses <= SPOT.max_misses,
        correctResponse: { changes: SPOT.changes.map((c) => c.id) },
      };
    },
  },
];
