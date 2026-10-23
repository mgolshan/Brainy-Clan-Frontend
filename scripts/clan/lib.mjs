/**
 * Tiny SVG + colour helpers for the Clan generator (no dependencies).
 * Numbers are rounded to one decimal so the generated SVGs stay small.
 */

const round = (n) => Math.round(n * 10) / 10;

/** Tagged template for path data: interpolated numbers are rounded. */
export function d(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += (typeof v === 'number' ? round(v) : v) + strings[i + 1];
  });
  return out.replace(/\s+/g, ' ').trim();
}

function attrs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? round(v) : v}"`)
    .join(' ');
}

export const el = (tag, a) => `<${tag} ${attrs(a)}/>`;
export const circle = (cx, cy, r, fill, extra = {}) => el('circle', { cx, cy, r, fill, ...extra });
export const ellipse = (cx, cy, rx, ry, fill, extra = {}) =>
  el('ellipse', { cx, cy, rx, ry, fill, ...extra });
export const path = (pd, fill, extra = {}) => el('path', { d: pd, fill, ...extra });
/** Round-capped stroke. */
export const line = (pd, stroke, width, extra = {}) =>
  el('path', {
    d: pd,
    fill: 'none',
    stroke,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...extra,
  });
/** Filled shape with softened corners (fill + same-colour round-joined stroke, like Ollie). */
export const soft = (pd, fill, width = 8, extra = {}) =>
  el('path', {
    d: pd,
    fill,
    stroke: fill,
    'stroke-width': width,
    'stroke-linejoin': 'round',
    ...extra,
  });
export const group = (content, transform) =>
  transform ? `<g transform="${transform}">${content}</g>` : `<g>${content}</g>`;
export const rot = (deg, x, y) => `rotate(${round(deg)} ${round(x)} ${round(y)})`;

/** Soft-shaded ellipse: a darker crescent at the bottom-right under the base colour. */
export function blob(cx, cy, rx, ry, base, shade, extra = {}) {
  return (
    ellipse(cx, cy, rx, ry, shade, extra) +
    ellipse(cx - rx * 0.035, cy - ry * 0.055, rx * 0.955, ry * 0.935, base, extra)
  );
}

/** Point on an ellipse at angle `deg` (0 = top, clockwise). */
export function onEllipse(cx, cy, rx, ry, deg, k = 1) {
  const a = (deg * Math.PI) / 180;
  return [cx + rx * k * Math.sin(a), cy - ry * k * Math.cos(a)];
}

// ---------------------------------------------------------------------------
// colour
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHex([r, g, b]) {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
export const darken = (c, t) => mix(c, '#1B1530', t);
export const lighten = (c, t) => mix(c, '#FFFFFF', t);

export function hue(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null; // grey
  const dd = max - min;
  let h;
  if (max === r) h = ((g - b) / dd) % 6;
  else if (max === g) h = (b - r) / dd + 2;
  else h = (r - g) / dd + 4;
  return (h * 60 + 360) % 360;
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Desaturate toward a warm grey (grandparents' fur is a little silvered). */
export function silver(c, t = 0.28) {
  const L = luminance(c);
  const grey = L > 0.5 ? '#E9E6EE' : L > 0.2 ? '#B9B6C2' : '#6F6C7C';
  return mix(c, grey, t);
}

/** Pick the first colour from `list` (starting at `offset`) that stands apart from `avoid`. */
export function pickContrasting(list, offset, avoid) {
  for (let i = 0; i < list.length; i++) {
    const c = list[(offset + i) % list.length];
    if (avoid.every((a) => distinct(c, a))) return c;
  }
  return list[offset % list.length];
}
function distinct(a, b) {
  const ha = hue(a);
  const hb = hue(b);
  const dl = Math.abs(luminance(a) - luminance(b));
  if (ha === null || hb === null) return dl > 0.12;
  const dh = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb));
  return dh > 38 || dl > 0.25;
}
