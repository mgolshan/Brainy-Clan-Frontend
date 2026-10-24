/**
 * Shared props for the category illustrations: palette, the Clan character placer, stroke glyphs
 * (digits/letters drawn as paths so they look the same everywhere, no fonts) and small objects.
 * Same flat style as the Clan avatars: soft shapes, a darker crescent for shading, no outlines.
 */
import {
  blob,
  circle,
  d,
  darken,
  ellipse,
  lighten,
  line,
  path,
  silver,
  soft,
} from '../clan/lib.mjs';
import { SPECIES } from '../clan/species.mjs';
import { compose, geometry } from '../clan/variants.mjs';

export const INK = '#1B2A4A';
export const C = {
  blue: '#4C8DFF',
  sky: '#8FD0FF',
  green: '#5BBF7A',
  leaf: '#7ED36A',
  yellow: '#FFC93D',
  orange: '#FF8A3D',
  red: '#FF5A6E',
  pink: '#FF7EB0',
  purple: '#8E6CE2',
  teal: '#22B8A8',
  paper: '#FFF4DC',
  paperShade: '#EED7AA',
  wood: '#D29A62',
  woodShade: '#B07A47',
  white: '#FFFFFF',
};

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

/**
 * A Clan character bust (avatar art) with its head centre at (hx, hy), scaled by `s`.
 * Returns { svg, head: {x, y, rx, ry}, fur, bottom } in scene coordinates.
 */
export function character(species, variant, hx, hy, s, rotate = 0) {
  const index = SPECIES.findIndex((sp) => sp.key === species);
  if (index < 0) throw new Error(`unknown species ${species}`);
  const spec = SPECIES[index];
  const g = geometry(spec, variant);
  const tx = hx - g.cx * s;
  const ty = hy - g.cy * s;
  const old = variant === 'grandma' || variant === 'grandpa';
  const fur = old ? silver(spec.colors.fur) : spec.colors.fur;
  const rotation = rotate ? ` rotate(${rotate} ${g.cx} ${g.cy})` : '';
  return {
    svg: `<g transform="translate(${r1(tx)} ${r1(ty)}) scale(${s})${rotation}">${inner(compose(spec, variant, index))}</g>`,
    head: { x: hx, y: hy, rx: g.rx * s, ry: g.ry * s },
    fur,
    shade: spec.colors.shade ?? darken(fur, 0.14),
    colors: spec.colors,
    bottom: ty + 256 * s,
  };
}
const r1 = (n) => Math.round(n * 10) / 10;

/** A paw (round mitten with a lighter pad hint). */
export function paw(x, y, r, fur) {
  return (
    circle(x, y, r, darken(fur, 0.12)) +
    circle(x - r * 0.08, y - r * 0.1, r * 0.9, fur) +
    [-0.38, 0, 0.38]
      .map((k) =>
        line(d`M${x + k * r} ${y + r * 0.25} l0 ${-r * 0.32}`, darken(fur, 0.22), r * 0.13),
      )
      .join('')
  );
}

/** Soft ground shadow. */
export const shadow = (x, y, rx, ry = rx * 0.16) => ellipse(x, y, rx, ry, INK, { opacity: 0.12 });

/** Four-point sparkle. */
export function sparkle(x, y, r, fill = C.yellow) {
  const k = r * 0.28;
  return path(
    d`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`,
    fill,
  );
}

// ---------------------------------------------------------------------------
// stroke glyphs (10 × 14 box, y down) — absolute M/L/H/V/Q/Z only
// ---------------------------------------------------------------------------

const GLYPHS = {
  0: 'M5 1 Q9 1 9 7 Q9 13 5 13 Q1 13 1 7 Q1 1 5 1 Z',
  1: 'M2.6 3.6 L6 1 V13',
  2: 'M1.6 4 Q2 1 5 1 Q8.5 1 8.5 4.2 Q8.5 6.4 5.2 9.2 L1.6 13 H8.6',
  3: 'M1.6 2.6 Q3 1 5 1 Q8.4 1 8.4 3.8 Q8.4 6.6 4.8 6.8 Q8.9 7 8.9 10 Q8.9 13 5 13 Q2.6 13 1.4 11.4',
  4: 'M7 13 V1 L1.2 9.4 H9.4',
  5: 'M8.4 1 H2.6 L2.1 6.4 Q3.5 5.5 5 5.5 Q8.9 5.5 8.9 9.2 Q8.9 13 5 13 Q2.6 13 1.4 11.6',
  6: 'M8 2 Q6.6 1 5.1 1 Q1.4 1 1.4 8 Q1.4 13 5 13 Q8.6 13 8.6 9.3 Q8.6 5.8 5.2 5.8 Q2.6 5.8 1.5 8',
  7: 'M1.4 1 H8.8 L4 13',
  8: 'M5 6.6 Q1.8 6.4 1.8 3.8 Q1.8 1 5 1 Q8.2 1 8.2 3.8 Q8.2 6.4 5 6.6 Q1.3 6.8 1.3 9.8 Q1.3 13 5 13 Q8.7 13 8.7 9.8 Q8.7 6.8 5 6.6 Z',
  9: 'M8.5 6 Q7.5 8.2 5 8.2 Q1.4 8.2 1.4 4.6 Q1.4 1 5 1 Q8.6 1 8.6 6 Q8.6 13 4 13 Q2.6 13 1.8 12.2',
  '+': 'M5 3 V11 M1 7 H9',
  '×': 'M1.8 3.8 L8.2 10.2 M8.2 3.8 L1.8 10.2',
  '=': 'M1.2 4.8 H8.8 M1.2 9.2 H8.8',
  '?': 'M1.8 4.2 Q1.8 1 5 1 Q8.6 1 8.6 4 Q8.6 6.2 5.6 7.6 Q5 8 5 9.4',
  A: 'M1 13 L5 1 L9 13 M2.5 8.8 H7.5',
  B: 'M2 7 V1 H5.4 Q8.3 1 8.3 3.9 Q8.3 6.8 5.4 7 H2 V13 H5.8 Q9 13 9 9.9 Q9 7 5.6 7',
  C: 'M8.8 3 Q7.5 1 5.3 1 Q1.2 1 1.2 7 Q1.2 13 5.3 13 Q7.5 13 8.8 11',
  D: 'M2 1 V13 H4.6 Q9 13 9 7 Q9 1 4.6 1 Z',
  E: 'M8.4 1 H2 V13 H8.4 M2 7 H7',
  O: 'M5 1 Q9 1 9 7 Q9 13 5 13 Q1 13 1 7 Q1 1 5 1 Z',
  R: 'M2 13 V1 H5.6 Q8.6 1 8.6 4 Q8.6 7 5.6 7 H2 M5.4 7 L8.8 13',
  W: 'M0.6 1 L2.8 13 L5 4.6 L7.2 13 L9.4 1',
  Z: 'M1.4 1 H8.6 L1.4 13 H8.6',
  H: 'M1.6 1 V13 M8.4 1 V13 M1.6 7 H8.4',
  J: 'M7.4 1 V9.4 Q7.4 13 4.4 13 Q1.8 13 1.2 10.6',
  L: 'M2 1 V13 H8.4',
  N: 'M1.6 13 V1 L8.4 13 V1',
  P: 'M2 13 V1 H5.6 Q8.8 1 8.8 4.2 Q8.8 7.4 5.6 7.4 H2',
  T: 'M1 1 H9 M5 1 V13',
  U: 'M1.6 1 V9 Q1.6 13 5 13 Q8.4 13 8.4 9 V1',
  S: 'M8.4 2.8 Q7.2 1 5 1 Q1.8 1 1.8 3.8 Q1.8 6.2 5 7 Q8.8 7.8 8.8 10.2 Q8.8 13 5 13 Q2.4 13 1.2 11',
};

/** Map a glyph path into scene coordinates: centred at (cx, cy), `h` tall. */
function placeGlyph(pd, cx, cy, h) {
  const k = h / 14;
  const X = (v) => cx + (v - 5) * k;
  const Y = (v) => cy + (v - 7) * k;
  const tokens = pd.match(/[MLHVQZ]|-?\d*\.?\d+/g);
  let out = '';
  let cmd = '';
  let nums = [];
  const flush = () => {
    if (!cmd) return;
    if (cmd === 'Z') out += 'Z ';
    else if (cmd === 'H') out += `H${r1(X(nums[0]))} `;
    else if (cmd === 'V') out += `V${r1(Y(nums[0]))} `;
    else out += cmd + nums.map((v, i) => r1(i % 2 === 0 ? X(v) : Y(v))).join(' ') + ' ';
    nums = [];
  };
  for (const t of tokens) {
    if (/[MLHVQZ]/.test(t)) {
      flush();
      cmd = t;
    } else nums.push(parseFloat(t));
  }
  flush();
  return out.trim();
}

/** A stroke glyph, `h` tall, stroke width `w` (defaults scale with size). */
export function glyph(ch, cx, cy, h, color, w = h * 0.17) {
  const pd = GLYPHS[ch];
  if (!pd) throw new Error(`no glyph ${ch}`);
  let s = line(placeGlyph(pd, cx, cy, h), color, w);
  if (ch === '?') s += circle(cx, cy + h * 0.43, w * 0.62, color);
  return s;
}

/** A word of stroke glyphs centred at (cx, cy), letters `h` tall. */
export function word(text, cx, cy, h, color, w = h * 0.17) {
  const step = h * 0.78;
  const x0 = cx - ((text.length - 1) * step) / 2;
  return [...text].map((ch, i) => glyph(ch, x0 + i * step, cy, h, color, w)).join('');
}

/** Rounded square tile with a glyph (letter/number token), optional rotation. */
export function tile(ch, x, y, size, fill, ink = INK, rotate = 0) {
  const r = size * 0.22;
  const h = size / 2;
  const body =
    soft(
      d`M${x - h + r} ${y - h + 2} H${x + h - r} Q${x + h} ${y - h + 2} ${x + h} ${y - h + r + 2} V${y + h - r + 2} Q${x + h} ${y + h + 2} ${x + h - r} ${y + h + 2} H${x - h + r} Q${x - h} ${y + h + 2} ${x - h} ${y + h - r + 2} V${y - h + r + 2} Q${x - h} ${y - h + 2} ${x - h + r} ${y - h + 2} Z`,
      darken(fill, 0.18),
      size * 0.08,
    ) +
    soft(
      d`M${x - h + r} ${y - h} H${x + h - r} Q${x + h} ${y - h} ${x + h} ${y - h + r} V${y + h - r - 2} Q${x + h} ${y + h - 2} ${x + h - r} ${y + h - 2} H${x - h + r} Q${x - h} ${y + h - 2} ${x - h} ${y + h - r - 2} V${y - h + r} Q${x - h} ${y - h} ${x - h + r} ${y - h} Z`,
      fill,
      size * 0.08,
    ) +
    ellipse(x - h * 0.45, y - h * 0.62, h * 0.28, h * 0.12, '#FFFFFF', { opacity: 0.45 }) +
    glyph(ch, x, y - 1, size * 0.58, ink);
  return rotate ? `<g transform="rotate(${rotate} ${r1(x)} ${r1(y)})">${body}</g>` : body;
}

/** Rounded rectangle path. */
export function rrect(x, y, w, h, r) {
  return d`M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
}

/** Motion lines (speed streaks) pointing left from (x, y). */
export function streaks(x, y, len, color, gap = 12, n = 3, w = 5) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const l = len * (i === 1 ? 1 : 0.7);
    s += line(d`M${x} ${y + i * gap} h${-l}`, color, w);
  }
  return s;
}

export { blob, circle, d, darken, ellipse, lighten, line, path, soft };
