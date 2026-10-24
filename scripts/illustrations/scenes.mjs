/**
 * One scene per top-level category (seeded slugs in the backend's categories.php) plus the
 * fallback. 256² viewBox, transparent background: every scene is a Clan character with a
 * foreground prop that hides the bottom edge of the avatar bust.
 */
import {
  blob,
  C,
  character,
  circle,
  d,
  darken,
  ellipse,
  glyph,
  INK,
  lighten,
  line,
  path,
  paw,
  rrect,
  shadow,
  soft,
  sparkle,
  streaks,
  tile,
} from './props.mjs';
import { MORE_SCENES } from './scenesMore.mjs';

// ---------------------------------------------------------------------------
// world-geography: fox explorer with a globe and a treasure map
// ---------------------------------------------------------------------------
function geography() {
  const fox = character('fox', 'kid', 150, 104, 0.66);
  const h = fox.head;
  let s = '';
  // globe on a stand (behind the map, beside the fox)
  const gx = 62;
  const gy = 150;
  const gr = 44;
  s += shadow(gx, 240, 40);
  s += soft(d`M${gx - 26} 238 Q${gx} 226 ${gx + 26} 238 Z`, '#E0A030', 6);
  s += line(d`M${gx} ${gy + gr + 4} V232`, '#E0A030', 8);
  s += fox.svg;
  // explorer hat
  const hy = h.y - h.ry * 0.62;
  s += ellipse(h.x, hy + 2, h.rx * 1.05, 10, '#C99A4E');
  s += soft(
    d`M${h.x - h.rx * 0.68} ${hy} Q${h.x - h.rx * 0.66} ${hy - h.ry * 0.86} ${h.x} ${hy - h.ry * 0.88} Q${h.x + h.rx * 0.66} ${hy - h.ry * 0.86} ${h.x + h.rx * 0.68} ${hy} Z`,
    '#E9C37A',
    6,
  );
  s += path(
    d`M${h.x - h.rx * 0.7} ${hy - 1} Q${h.x} ${hy - 9} ${h.x + h.rx * 0.7} ${hy - 1} L${h.x + h.rx * 0.7} ${hy - 10} Q${h.x} ${hy - 18} ${h.x - h.rx * 0.7} ${hy - 10} Z`,
    '#8A5A3B',
  );
  s += ellipse(h.x - h.rx * 0.25, hy - h.ry * 0.55, h.rx * 0.16, h.ry * 0.1, '#FFFFFF', {
    opacity: 0.45,
  });
  // globe ball with its ring
  s += blob(gx, gy, gr, gr, C.blue, darken(C.blue, 0.2));
  s += path(
    d`M${gx - 30} ${gy - 22} Q${gx - 14} ${gy - 34} ${gx + 2} ${gy - 26} Q${gx + 8} ${gy - 12} ${gx - 4} ${gy - 6} Q${gx - 18} ${gy + 2} ${gx - 24} ${gy + 16} Q${gx - 36} ${gy + 4} ${gx - 30} ${gy - 22} Z`,
    C.leaf,
  );
  s += path(
    d`M${gx + 14} ${gy + 2} Q${gx + 32} ${gy - 6} ${gx + 38} ${gy + 10} Q${gx + 30} ${gy + 30} ${gx + 14} ${gy + 34} Q${gx + 8} ${gy + 18} ${gx + 14} ${gy + 2} Z`,
    C.leaf,
  );
  s += ellipse(gx - 16, gy - 26, 9, 5, '#FFFFFF', { opacity: 0.5 });
  s += line(
    d`M${gx - gr - 8} ${gy + 14} Q${gx - gr} ${gy + gr + 12} ${gx + 6} ${gy + gr + 6}`,
    '#F2B33D',
    7,
  );
  // treasure map held in front
  const top = 176;
  const xs = [96, 134, 172, 210, 246];
  for (let i = 0; i < 4; i++) {
    const up = i % 2 === 0;
    const fill = up ? C.paper : C.paperShade;
    s += soft(
      d`M${xs[i]} ${top + (up ? 0 : 6)} L${xs[i + 1]} ${top + (up ? 6 : 0)} L${xs[i + 1]} ${top + (up ? 80 : 74)} L${xs[i]} ${top + (up ? 74 : 80)} Z`,
      fill,
      5,
    );
  }
  s += path(d`M110 196 Q122 186 134 194 Q140 206 126 210 Q112 212 110 196 Z`, C.leaf);
  s += line(d`M128 222 Q160 236 178 214 Q190 200 212 206`, C.red, 4, {
    'stroke-dasharray': '2 9',
  });
  s += line(d`M216 198 l14 14 M230 198 l-14 14`, C.red, 5.5);
  s += paw(100, 192, 13, fox.fur) + paw(242, 192, 13, fox.fur);
  return s;
}

// ---------------------------------------------------------------------------
// science-nature: owl with a microscope and a sprouting leaf
// ---------------------------------------------------------------------------
function science() {
  const owl = character('owl', 'kid', 108, 104, 0.64);
  let s = '';
  s += owl.svg;
  // bench
  s += soft(rrect(14, 196, 228, 58, 14), C.teal, 6);
  s += soft(rrect(14, 196, 228, 12, 6), lighten(C.teal, 0.25), 4);
  // potted sprout
  s += soft(d`M38 196 L42 170 H74 L78 196 Z`, '#E57A50', 5);
  s += soft(rrect(36, 164, 44, 10, 4), '#F0936A', 4);
  s += line(d`M58 166 Q57 146 60 132`, '#3E9B4F', 5);
  s += soft(d`M60 140 Q74 118 96 122 Q90 144 60 140 Z`, C.leaf, 4);
  s += soft(d`M58 150 Q40 136 30 146 Q42 160 58 150 Z`, '#5DBB55', 4);
  s += line(d`M62 139 Q76 130 90 125`, '#4FA644', 2.5);
  // microscope (right)
  const mx = 190;
  s += soft(rrect(mx - 34, 182, 68, 14, 6), INK, 4);
  s += soft(
    d`M${mx + 6} 182 Q${mx + 30} 150 ${mx + 14} 112 L${mx + 2} 118 Q${mx + 14} 148 ${mx - 8} 182 Z`,
    '#5A6B8C',
    4,
  );
  s += soft(rrect(mx - 30, 148, 40, 8, 3), '#5A6B8C', 3);
  s += soft(d`M${mx - 18} 96 L${mx + 4} 86 L${mx + 18} 132 L${mx - 2} 140 Z`, '#EEF2FA', 5);
  s += soft(d`M${mx - 4} 133 L${mx + 14} 127 L${mx + 18} 141 L${mx} 146 Z`, '#9AA8C2', 3);
  s += soft(d`M${mx - 22} 82 L${mx + 2} 72 L${mx + 6} 86 L${mx - 18} 96 Z`, C.purple, 4);
  s += circle(mx + 22, 130, 7, C.yellow);
  // the specimen: a little leaf on the stage
  s += soft(
    d`M${mx - 26} 147 Q${mx - 16} 138 ${mx - 4} 146 Q${mx - 16} 152 ${mx - 26} 147 Z`,
    C.leaf,
    2,
  );
  // wings resting on the bench
  s += soft(d`M58 200 Q70 172 92 182 Q86 200 70 206 Z`, owl.fur, 6);
  s += soft(d`M158 200 Q146 172 124 182 Q130 200 146 206 Z`, owl.fur, 6);
  s += sparkle(222, 64, 9, C.yellow) + sparkle(160, 54, 5, C.sky);
  return s;
}

// ---------------------------------------------------------------------------
// wisdom-cards: tortoise grandpa with a glowing book
// ---------------------------------------------------------------------------
function wisdom() {
  const t = character('turtle', 'grandpa', 128, 98, 0.66);
  let s = '';
  // glow behind the book
  s += circle(128, 190, 92, C.yellow, { opacity: 0.16 });
  s += circle(128, 190, 68, C.yellow, { opacity: 0.22 });
  s += t.svg;
  // open book
  s += soft(
    d`M28 250 Q78 236 128 252 Q178 236 228 250 L232 190 Q180 176 128 194 Q76 176 24 190 Z`,
    '#7A4FC7',
    6,
  );
  s += soft(d`M36 240 Q82 226 126 242 L126 194 Q82 176 34 188 Z`, '#FFF9E2', 5);
  s += soft(d`M220 240 Q174 226 130 242 L130 194 Q174 176 222 188 Z`, '#FFF4DA', 5);
  for (let i = 0; i < 4; i++) {
    const y = 202 + i * 10;
    s += line(d`M48 ${y - 4} Q80 ${y - 12} 112 ${y + 1}`, '#D9C9A8', 3);
    s += line(d`M144 ${y + 1} Q176 ${y - 12} 208 ${y - 4}`, '#D9C9A8', 3);
  }
  // light rising from the pages
  s += path(d`M98 194 L64 128 L192 128 L158 194 Z`, '#FFE27A', { opacity: 0.28 });
  s += ellipse(128, 196, 44, 12, '#FFF3B0', { opacity: 0.9 });
  s +=
    sparkle(96, 148, 9, C.yellow) +
    sparkle(168, 136, 12, C.yellow) +
    sparkle(132, 120, 6, '#FFFFFF');
  s += sparkle(48, 120, 7, C.yellow) + sparkle(214, 108, 6, C.yellow);
  s += paw(30, 210, 13, t.fur) + paw(226, 210, 13, t.fur);
  return s;
}

// ---------------------------------------------------------------------------
// math-sprint: rabbit dashing with numbers trailing behind
// ---------------------------------------------------------------------------
function mathSprint() {
  const r = character('rabbit', 'kid', 150, 116, 0.6, 12);
  let s = '';
  // number trail behind
  s += line(d`M10 150 Q60 70 120 40`, C.sky, 5, { 'stroke-dasharray': '2 12', opacity: 0.9 });
  s += tile('1', 28, 128, 34, C.yellow, INK, -12);
  s += tile('+', 52, 72, 30, C.pink, INK, 8);
  s += tile('2', 100, 34, 32, C.sky, INK, -6);
  s += tile('=', 22, 196, 28, C.leaf, INK, 10);
  s += streaks(82, 150, 40, lighten(C.blue, 0.4), 13, 3, 6);
  s += r.svg;
  // headband
  // stopwatch in front
  const cx = 190;
  const cy = 196;
  s += soft(rrect(cx - 7, cy - 52, 14, 12, 3), '#5A6B8C', 3);
  s += soft(rrect(cx - 12, cy - 58, 24, 8, 4), C.red, 3);
  s += blob(cx, cy, 40, 40, C.orange, darken(C.orange, 0.2));
  s += circle(cx, cy, 31, '#FFFFFF');
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const k = i % 3 === 0 ? 0.7 : 0.82;
    s += line(
      d`M${cx + Math.sin(a) * 26 * k} ${cy - Math.cos(a) * 26 * k} L${cx + Math.sin(a) * 26} ${cy - Math.cos(a) * 26}`,
      '#B8C2D8',
      2.4,
    );
  }
  s += line(d`M${cx} ${cy} L${cx + 13} ${cy - 15}`, C.red, 5);
  s += line(d`M${cx} ${cy} L${cx} ${cy - 22}`, INK, 4);
  s += circle(cx, cy, 4.5, INK);
  // dust puffs where the feet are
  s +=
    circle(70, 236, 18, '#E6E1F0') +
    circle(100, 226, 26, '#EEEAF5') +
    circle(136, 236, 26, '#E6E1F0');
  s +=
    circle(166, 248, 20, '#EEEAF5') +
    circle(46, 248, 12, '#EEEAF5') +
    circle(112, 252, 22, '#E6E1F0');
  s += paw(156, 214, 13, r.fur);
  s += tile('3', 232, 120, 30, C.purple, '#FFFFFF', 14);
  return s;
}

// ---------------------------------------------------------------------------
// sudoku: panda placing a number tile on a grid
// ---------------------------------------------------------------------------
function sudoku() {
  const p = character('panda', 'kid', 128, 92, 0.6);
  let s = p.svg;
  // board in perspective: top edge narrower
  const T = { y: 160, x0: 54, x1: 202 };
  const B = { y: 248, x0: 18, x1: 238 };
  const at = (u, v) => {
    const y = T.y + (B.y - T.y) * v;
    const x0 = T.x0 + (B.x0 - T.x0) * v;
    const x1 = T.x1 + (B.x1 - T.x1) * v;
    return [x0 + (x1 - x0) * u, y];
  };
  const quad = (u0, v0, u1, v1) => {
    const a = at(u0, v0);
    const b = at(u1, v0);
    const c = at(u1, v1);
    const e = at(u0, v1);
    return d`M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} L${e[0]} ${e[1]} Z`;
  };
  s += soft(
    d`M${T.x0 - 6} ${T.y - 6} L${T.x1 + 6} ${T.y - 6} L${B.x1 + 8} ${B.y + 2} L${B.x0 - 8} ${B.y + 2} Z`,
    '#3D4A6B',
    8,
  );
  const fills = ['#FFFFFF', '#EAF2FF'];
  const nums = { '0,0': '5', '2,0': '3', '1,1': '7', '0,2': '8', '2,2': '1' };
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const g = 0.025;
      s += soft(
        quad(i / 3 + g, j / 3 + g, (i + 1) / 3 - g, (j + 1) / 3 - g),
        fills[(i + j) % 2],
        3,
      );
      const n = nums[`${i},${j}`];
      if (n) {
        const [x, y] = at((i + 0.5) / 3, (j + 0.5) / 3);
        s += glyph(n, x, y, 14 + j * 3, j === 1 ? C.blue : INK);
      }
    }
  // empty cell glows: the tile is about to land there
  s += soft(quad(2 / 3 + 0.025, 1 / 3 + 0.025, 1 - 0.025, 2 / 3 - 0.025), '#FFF1B8', 3);
  // paws: one resting, one holding the tile above the free cell
  const [tx, ty] = at(5 / 6, 0.5);
  s += line(d`M${tx + 4} ${ty - 26} V${ty - 12}`, C.blue, 3, { 'stroke-dasharray': '1 6' });
  s += paw(tx - 16, ty - 34, 12, '#45424F');
  s += tile('9', tx + 4, ty - 48, 34, C.yellow, INK, 8);
  s += paw(tx + 22, ty - 32, 12, '#45424F');
  s += sparkle(tx - 20, ty - 70, 6, C.yellow);
  return s;
}

// ---------------------------------------------------------------------------
// word-puzzles: monkey juggling letters above letter blocks
// ---------------------------------------------------------------------------
function wordPuzzles() {
  const m = character('monkey', 'kid', 128, 124, 0.58);
  let s = '';
  // juggling arc
  s += line(d`M50 112 Q128 -12 206 112`, C.sky, 4, { 'stroke-dasharray': '2 11' });
  s += m.svg;
  // raised arms
  s += line(d`M86 196 Q60 168 54 124`, m.fur, 18);
  s += line(d`M170 196 Q196 168 202 124`, m.fur, 18);
  s += paw(54, 118, 14, m.fur) + paw(202, 118, 14, m.fur);
  // letters in the air
  s += tile('A', 70, 52, 34, C.red, '#FFFFFF', -14);
  s += tile('B', 128, 24, 34, C.yellow, INK, 6);
  s += tile('C', 186, 52, 34, C.blue, '#FFFFFF', 14);
  // letter blocks in front
  const blocks = [
    ['W', C.leaf],
    ['O', C.orange],
    ['R', C.purple],
    ['D', C.pink],
  ];
  s += shadow(128, 248, 112, 6);
  blocks.forEach(([ch, col], i) => {
    s += tile(ch, 47 + i * 54, 220, 50, col, '#FFFFFF', i % 2 ? 3 : -3);
  });
  return s;
}

// ---------------------------------------------------------------------------
// history: elephant with a scroll, a castle and a pyramid behind
// ---------------------------------------------------------------------------
function history() {
  const e = character('elephant', 'kid', 128, 112, 0.6);
  let s = '';
  // pyramid (right) and castle (left) silhouettes
  s += path(d`M150 196 L206 84 L262 196 Z`, '#F4C98A');
  s += path(d`M206 84 L262 196 L226 196 Z`, '#E2AE68');
  s += line(d`M184 128 H228 M172 152 H240 M160 176 H252`, '#E2AE68', 3);
  const cast = '#B8A9E6';
  s += path(
    d`M2 196 V100 H16 V88 H26 V100 H36 V88 H46 V100 H56 V196 Z M56 196 V128 H66 V118 H76 V128 H86 V118 H96 V196 Z`,
    cast,
  );
  s += path(d`M22 196 V170 Q29 160 36 170 V196 Z`, darken(cast, 0.18));
  s += line(d`M29 88 V64`, '#8A7BC4', 3);
  s += path(d`M29 64 L46 70 L29 76 Z`, C.red);
  s += e.svg;
  // scroll held in front
  const y0 = 194;
  s += soft(d`M40 ${y0} H216 V${y0 + 58} H40 Z`, C.paper, 6);
  for (let i = 0; i < 3; i++)
    s += line(d`M60 ${y0 + 16 + i * 12} H${i === 2 ? 150 : 196}`, '#D8BF8E', 4);
  s += line(d`M162 ${y0 + 42} q8 -8 16 0 q8 8 16 0`, '#B04A4A', 3);
  for (const x of [36, 220]) {
    s += soft(rrect(x - 10, y0 - 10, 20, 74, 9), '#E8C88E', 4);
    s += soft(rrect(x - 4, y0 - 16, 8, 86, 4), '#A8683C', 3);
  }
  s += paw(54, y0 + 6, 13, e.fur) + paw(202, y0 + 6, 13, e.fur);
  return s;
}

// ---------------------------------------------------------------------------
// vocabulary-spelling: cat mom with a spelling bee and a letter card
// ---------------------------------------------------------------------------
function vocabulary() {
  const cat = character('cat', 'mom', 112, 110, 0.6);
  let s = cat.svg;
  // bee flight path
  s += line(d`M120 34 Q170 4 196 40 Q210 64 186 70`, '#C7B8F0', 3.5, { 'stroke-dasharray': '2 9' });
  // the bee
  const bx = 206;
  const by = 96;
  s += ellipse(bx - 6, by - 20, 13, 16, '#FFFFFF', {
    opacity: 0.85,
    transform: `rotate(-24 ${bx - 6} ${by - 20})`,
  });
  s += ellipse(bx + 10, by - 20, 11, 14, '#EAF6FF', {
    opacity: 0.9,
    transform: `rotate(20 ${bx + 10} ${by - 20})`,
  });
  s += blob(bx, by, 26, 20, C.yellow, '#F0B020');
  s += path(
    d`M${bx - 8} ${by - 19} Q${bx - 2} ${by} ${bx - 8} ${by + 19} L${bx - 16} ${by + 15} Q${bx - 10} ${by} ${bx - 16} ${by - 15} Z`,
    INK,
  );
  s += path(
    d`M${bx + 6} ${by - 19} Q${bx + 12} ${by} ${bx + 6} ${by + 19} L${bx - 1} ${by + 19} Q${bx + 5} ${by} ${bx - 1} ${by - 19} Z`,
    INK,
  );
  s += path(d`M${bx + 26} ${by} l8 -3 l-1 6 Z`, INK);
  s += circle(bx - 18, by - 3, 3.4, INK) + circle(bx - 17, by - 4.2, 1.2, '#FFFFFF');
  s += line(d`M${bx - 22} ${by + 6} q3 3 6 0`, INK, 2);
  s += line(d`M${bx - 16} ${by - 18} q-4 -12 -12 -12`, INK, 2.4) + circle(bx - 28, by - 30, 3, INK);
  // letter card held in front: B-E-E
  s += shadow(122, 248, 104, 6);
  s += soft(rrect(28, 182, 196, 72, 16), '#FFFFFF', 6);
  s += soft(rrect(28, 236, 196, 18, 8), '#E7E2F5', 4);
  s += tile('B', 70, 208, 40, C.yellow, INK, -5);
  s += tile('E', 126, 206, 40, C.pink, '#FFFFFF', 3);
  s += tile('E', 182, 208, 40, C.sky, INK, -3);
  s += paw(32, 188, 13, cat.fur) + paw(220, 188, 13, cat.fur);
  s += sparkle(46, 66, 7, C.yellow) + sparkle(30, 110, 5, C.pink);
  return s;
}

// ---------------------------------------------------------------------------
// fallback: Ollie peeking over a question-mark box
// ---------------------------------------------------------------------------
function fallback() {
  const o = character('owl', 'kid', 128, 100, 0.62);
  let s = o.svg;
  s += shadow(128, 248, 96, 6);
  s += soft(rrect(40, 170, 176, 84, 14), C.purple, 8);
  s += soft(rrect(40, 170, 176, 20, 10), lighten(C.purple, 0.25), 6);
  s += glyph('?', 128, 218, 42, '#FFFFFF', 8);
  s += paw(70, 172, 14, o.fur) + paw(186, 172, 14, o.fur);
  s += sparkle(44, 70, 8, C.yellow) + sparkle(214, 84, 6, C.sky);
  return s;
}

export const SCENES = {
  'world-geography': geography,
  'science-nature': science,
  'wisdom-cards': wisdom,
  'math-sprint': mathSprint,
  sudoku,
  'word-puzzles': wordPuzzles,
  history,
  'vocabulary-spelling': vocabulary,
  ...MORE_SCENES,
};
export const FALLBACK = fallback;
