/**
 * Variant layers (kid, teen, mom, dad, grandma, grandpa) and the composer that turns a species
 * spec + variant into one SVG. Head-and-shoulders bust in a 256² square, flat shapes with soft
 * shading and no outline (like Ollie, assets/brand/owl.svg).
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
  pickContrasting,
  rot,
  silver,
  soft,
} from './lib.mjs';
import { defaultBody, INK, owlEyeR, puffRing, whiskers } from './species.mjs';

export const VARIANTS = ['kid', 'teen', 'mom', 'dad', 'grandma', 'grandpa'];

const BASE = {
  kid: { cy: 120, rx: 79, ry: 72, eyeRx: 11.5, eyeRy: 13, eyeY: 0.1, bodyTop: 188, bodyRx: 78 },
  teen: { cy: 112, rx: 71, ry: 72, eyeRx: 9.6, eyeRy: 11.4, eyeY: 0.06, bodyTop: 180, bodyRx: 92 },
  mom: { cy: 108, rx: 71, ry: 67, eyeRx: 8.8, eyeRy: 10.2, eyeY: 0.04, bodyTop: 172, bodyRx: 100 },
  dad: { cy: 108, rx: 73, ry: 67, eyeRx: 8.6, eyeRy: 10, eyeY: 0.02, bodyTop: 172, bodyRx: 106 },
  grandma: { cy: 110, rx: 71, ry: 66, eyeRx: 8, eyeRy: 9.2, eyeY: 0.04, bodyTop: 174, bodyRx: 100 },
  grandpa: { cy: 110, rx: 73, ry: 66, eyeRx: 8, eyeRy: 9.2, eyeY: 0.02, bodyTop: 174, bodyRx: 104 },
};

// Clothing palettes (picked per species so each family wears something different).
const TEEN = ['#4C7BF4', '#7A5AF5', '#1FA39B', '#F25F5C', '#3D405B', '#FF9F1C', '#E0457B'];
const MOM = ['#E85D9E', '#8E5CF5', '#20A39E', '#F28C38', '#4C8DFF', '#D94A5B', '#5BBF7A'];
const DAD = ['#4E7FE0', '#2E9C78', '#F2B33D', '#E26D4E', '#6C63FF', '#2A8FA6', '#C2477A'];
const GRANDMA = ['#C76A9A', '#7C9BD6', '#D98C5F', '#7FB07A', '#A88BD6', '#E3A33E'];
const GRANDPA = ['#7D8F5E', '#A27752', '#6779A6', '#9C6378', '#C7A05F', '#5E9C95'];
const ACCENT = ['#FF5A6E', '#FFC23D', '#3DB7FF', '#9B6BFF', '#FF8A3D', '#2BC48A'];
const GRANDMA_FRAMES = ['#B0476A', '#2F8F8A', '#B7832A', '#7B55C7', '#D0563B'];
const GRANDPA_FRAMES = ['#5A4A3F', '#34466B', '#8A3B3B', '#2E2E38'];
/** Grandpas wearing a flat cap (ears/horns elsewhere would clash with it). */
const FLATCAP = new Set(['bear', 'dog', 'turtle', 'otter', 'elephant']);
const LIPS = ['#E0527A', '#F2665A', '#B8336A', '#C9455E'];

export function geometry(spec, v) {
  const b = BASE[v];
  const rx = b.rx * (spec.headW ?? 1);
  const ry = b.ry * (spec.headH ?? 1);
  const cx = 128;
  const cy = b.cy + (spec.headDy ?? 0);
  const eyeY = cy + ry * (b.eyeY + (spec.eyeDy ?? 0));
  const noseY = cy + ry * ((v === 'kid' ? 0.36 : 0.32) + (spec.noseYOffset ?? 0));
  const mouthY = noseY + ry * (0.15 + (spec.mouthDy ?? 0));
  return {
    v,
    cx,
    cy,
    rx,
    ry,
    eyeDx: rx * (spec.eyeSpread ?? 0.37),
    eyeY,
    eyeRx: b.eyeRx,
    eyeRy: b.eyeRy,
    noseY,
    mouthY,
    mouthW: rx * (spec.mouthW ?? 0.17),
    bodyTop: b.bodyTop,
    bodyRx: b.bodyRx,
  };
}

function colors(spec, v, index) {
  const old = v === 'grandma' || v === 'grandpa';
  const base = { ...spec.colors };
  const c = { ...base };
  if (old) {
    c.fur = silver(base.fur);
    if (base.shade) c.shade = silver(base.shade);
    if (base.light) c.light = silver(base.light, 0.15);
  }
  c.shade = c.shade ?? darken(c.fur, 0.14);
  c.cheek = '#FF7A9A';
  const avoid = [c.fur, spec.colors.dark];
  c.teen = pickContrasting(TEEN, index, avoid);
  c.mom = pickContrasting(MOM, index, avoid);
  c.dad = pickContrasting(DAD, index, avoid);
  c.grandma = pickContrasting(GRANDMA, index, avoid);
  c.grandpa = pickContrasting(GRANDPA, index, avoid);
  c.accent = pickContrasting(ACCENT, index + 2, [c.fur, c.mom, c.dad, c.teen]);
  c.lips = LIPS[index % LIPS.length];
  c.grey = '#E4E2EC';
  c.greyShade = '#C3C0D0';
  c.white = '#FFFFFF';
  return c;
}

// ---------------------------------------------------------------------------
// eyes, brows, mouths
// ---------------------------------------------------------------------------

function eyePositions(spec, g) {
  if (spec.eyes === 'frog') {
    return [-1, 1].map((s) => [g.cx + s * g.eyeDx * 1.15, g.cy - g.ry * 0.5]);
  }
  return [-1, 1].map((s) => [g.cx + s * g.eyeDx, g.eyeY]);
}

function eyes(spec, g, c) {
  const pos = eyePositions(spec, g);
  const kid = g.v === 'kid';
  let s = '';
  pos.forEach(([x, y], i) => {
    const side = i === 0 ? -1 : 1;
    if (spec.eyes === 'owl') {
      const r = owlEyeR(g);
      s += circle(x, y, r, '#FFFFFF');
      if (g.v === 'grandma') {
        s += line(
          d`M${x - r * 0.5} ${y + 3} Q${x} ${y - r * 0.55} ${x + r * 0.5} ${y + 3}`,
          INK,
          5,
        );
      } else {
        // pupils look slightly inward like Ollie's
        const pr = r * 0.54;
        s += circle(x - side * r * 0.17, y + r * 0.13, pr, INK);
        s += circle(x - side * r * 0.17 + pr * 0.36, y - pr * 0.3, pr * 0.34, '#FFFFFF');
      }
      if (g.v === 'mom') s += lashes(x, y, r * 0.98, r * 0.98, side, INK);
      return;
    }
    if (spec.eyes === 'frog') {
      const r = g.rx * 0.24;
      s += circle(x, y, r, '#FFFFFF');
      if (g.v === 'grandma') {
        s += line(d`M${x - r * 0.5} ${y + 2} Q${x} ${y - r * 0.6} ${x + r * 0.5} ${y + 2}`, INK, 5);
      } else {
        const pr = g.eyeRx * 1.0;
        s += ellipse(x, y + 2, pr, pr * 1.1, INK);
        s += circle(x + pr * 0.35, y - pr * 0.25, pr * 0.36, '#FFFFFF');
      }
      if (g.v === 'mom') s += lashes(x, y, r * 0.98, r * 0.98, side, INK);
      return;
    }
    if (spec.eyes === 'patch') {
      s += ellipse(x, y, g.eyeRx * 1.25, g.eyeRy * 1.2, '#FFFFFF');
    }
    if (g.v === 'grandma') {
      // happy closed eyes
      s += line(
        d`M${x - g.eyeRx * 1.05} ${y + 2} Q${x} ${y - g.eyeRy * 1.05} ${x + g.eyeRx * 1.05} ${y + 2}`,
        INK,
        4.4,
      );
      return;
    }
    s += ellipse(x, y, g.eyeRx, g.eyeRy, INK);
    s += circle(x + g.eyeRx * 0.32, y - g.eyeRy * 0.34, g.eyeRx * (kid ? 0.4 : 0.36), '#FFFFFF');
    if (kid || g.v === 'teen')
      s += circle(x - g.eyeRx * 0.34, y + g.eyeRy * 0.38, g.eyeRx * 0.17, '#FFFFFF');
    if (g.v === 'mom') s += lashes(x, y, g.eyeRx, g.eyeRy, side, INK);
  });
  return s;
}

function lashes(x, y, rx, ry, side, color) {
  let s = '';
  [-50, -22, 6].forEach((deg, i) => {
    const a = ((side === 1 ? deg : -deg) * Math.PI) / 180;
    const x0 = x + Math.sin(a) * rx * 0.95 * side;
    const y0 = y - Math.cos(a) * ry * 0.95;
    const len = 5.5 + (i === 1 ? 1 : 0);
    s += line(
      d`M${x0} ${y0} l${Math.sin(a) * len * side + side * 2} ${-Math.cos(a) * len - 1}`,
      color,
      2.6,
    );
  });
  // re-orient: outer lashes sweep outward
  return s.replace(/NaN/g, '0');
}

function brows(spec, g, color, bushy) {
  const pos = eyePositions(spec, g);
  let s = '';
  pos.forEach(([x, y], i) => {
    const side = i === 0 ? -1 : 1;
    const ry =
      spec.eyes === 'owl' ? owlEyeR(g) * 1.3 : spec.eyes === 'frog' ? g.rx * 0.26 : g.eyeRy * 1.9;
    const by = y - ry - (bushy ? 3 : 2);
    const w = spec.eyes === 'owl' ? g.eyeRx * 1.4 : g.eyeRx * 1.25;
    if (bushy) {
      s +=
        circle(x - w * 0.6, by + 2, 5.4, color) +
        circle(x, by - 1, 6.2, color) +
        circle(x + w * 0.6, by + 2, 5.4, color);
      s += circle(x + side * w * 1.05, by + 5, 4.4, color);
    } else {
      s += line(d`M${x - w} ${by + 3 + side * 0} Q${x} ${by - 3} ${x + w} ${by + 3}`, color, 5);
    }
  });
  return s;
}

function mouth(spec, g, c) {
  if (spec.mouth === 'beak') return '';
  const x = g.cx;
  const y = g.mouthY;
  const w = g.mouthW;
  const ink = '#3A2230';
  const muzzle = spec.mouth === 'muzzle';
  let s = '';
  if (muzzle) s += line(d`M${x} ${g.noseY + g.ry * 0.08} L${x} ${y - 1}`, ink, 3);
  if (g.v === 'kid') {
    const ww = muzzle ? w * 1.0 : w;
    s += path(
      d`M${x - ww} ${y} Q${x} ${y + 3} ${x + ww} ${y} Q${x + ww * 0.9} ${y + ww * 1.25} ${x} ${y + ww * 1.3} Q${x - ww * 0.9} ${y + ww * 1.25} ${x - ww} ${y} Z`,
      '#6B2737',
    );
    s += ellipse(x, y + ww * 0.95, ww * 0.5, ww * 0.3, '#FF8FA3');
    if (spec.teeth)
      s += path(
        d`M${x - 5} ${y + 1} L${x + 5} ${y + 1} L${x + 4.5} ${y + 7} L${x - 4.5} ${y + 7} Z`,
        '#FFFFFF',
      );
    if (spec.fang) s += path(d`M${x + ww * 0.45} ${y + 1} l3 6 l3 -6 Z`, '#FFFFFF');
    return s;
  }
  if (g.v === 'mom') {
    const lw = Math.max(w * 0.85, 9);
    s += path(
      d`M${x - lw} ${y} Q${x - lw * 0.5} ${y - lw * 0.5} ${x} ${y - lw * 0.18} Q${x + lw * 0.5} ${y - lw * 0.5} ${x + lw} ${y} Q${x} ${y + lw * 0.8} ${x - lw} ${y} Z`,
      c.lips,
    );
    s += line(
      d`M${x - lw * 0.75} ${y + 0.5} Q${x} ${y + lw * 0.22} ${x + lw * 0.75} ${y + 0.5}`,
      darken(c.lips, 0.3),
      1.8,
    );
    s += ellipse(x + lw * 0.25, y + lw * 0.32, lw * 0.22, lw * 0.1, '#FFFFFF', { opacity: 0.5 });
    return s;
  }
  if (muzzle) {
    s += line(
      d`M${x - w} ${y - 2} Q${x - w * 0.5} ${y + w * 0.6} ${x} ${y - 1} Q${x + w * 0.5} ${y + w * 0.6} ${x + w} ${y - 2}`,
      ink,
      3.4,
    );
    if (spec.teeth && g.v === 'teen')
      s += path(
        d`M${x - 4.5} ${y} L${x + 4.5} ${y} L${x + 4} ${y + 6} L${x - 4} ${y + 6} Z`,
        '#FFFFFF',
      );
    if (spec.tongue && g.v === 'teen') s += ellipse(x + 3, y + 5, 4.5, 5, '#FF8FA3');
    return s;
  }
  // wide smile
  const tilt = g.v === 'teen' ? 2 : 0;
  s += line(d`M${x - w} ${y - 2 + tilt} Q${x} ${y + w * 0.55} ${x + w} ${y - 2 - tilt}`, ink, 3.6);
  if (spec.fang && g.v !== 'grandpa')
    s += path(d`M${x + w * 0.35} ${y + w * 0.15} l3 6 l3 -6 Z`, '#FFFFFF');
  return s;
}

function cheeks(spec, g, c) {
  if (spec.noCheeks && g.v !== 'kid' && g.v !== 'mom') return '';
  const op = { kid: 0.5, teen: 0.25, mom: 0.5, dad: 0.18, grandma: 0.45, grandpa: 0.2 }[g.v];
  const r = { kid: 1.15, mom: 1.05 }[g.v] ?? 0.9;
  const y = spec.eyes === 'owl' ? g.eyeY + owlEyeR(g) * 1.15 : g.eyeY + g.eyeRy * 1.75;
  const dx = spec.eyes === 'owl' ? g.eyeDx * 1.75 : g.eyeDx * 1.32;
  return [-1, 1]
    .map((s) =>
      ellipse(g.cx + s * dx, y, g.rx * 0.13 * r, g.ry * 0.085 * r, c.cheek, { opacity: op }),
    )
    .join('');
}

// ---------------------------------------------------------------------------
// clothes
// ---------------------------------------------------------------------------

function neck(g, c, w = 0.4) {
  return ellipse(g.cx, g.bodyTop - 4, g.rx * w, 26, c.shade);
}

function clothes(spec, g, c, index) {
  const top = g.bodyTop;
  const body = (col) => blob(g.cx, top + 86, g.bodyRx, 90, col, darken(col, 0.16));
  switch (g.v) {
    case 'kid':
      return '';
    case 'teen': {
      const col = c.teen;
      let s = body(col);
      // hood ring around the neck + drawstrings
      s += ellipse(g.cx, top + 4, g.rx * 0.82, 30, darken(col, 0.2));
      s += ellipse(g.cx, top + 1, g.rx * 0.58, 22, c.shade);
      s += line(d`M${g.cx - 13} ${top + 26} l-2 26 M${g.cx + 13} ${top + 26} l2 26`, '#FFFFFF', 4);
      s +=
        circle(g.cx - 15, top + 54, 3.5, '#FFFFFF') + circle(g.cx + 15, top + 54, 3.5, '#FFFFFF');
      return s;
    }
    case 'mom': {
      const col = c.mom;
      let s = body(col);
      // scoop neckline with a ruffle
      s += ellipse(g.cx, top + 2, g.rx * 0.62, 30, c.shade);
      s += ellipse(g.cx, top - 1, g.rx * 0.6, 27, c.fur);
      s += line(
        d`M${g.cx - g.rx * 0.6} ${top - 2} Q${g.cx} ${top + 50} ${g.cx + g.rx * 0.6} ${top - 2}`,
        lighten(col, 0.4),
        4,
      );
      // little pendant
      s += line(
        d`M${g.cx - g.rx * 0.38} ${top + 6} Q${g.cx} ${top + 34} ${g.cx + g.rx * 0.38} ${top + 6}`,
        '#FFC83D',
        2.2,
      );
      s += heart(g.cx, top + 26, 6.5, '#FFC83D');
      return s;
    }
    case 'dad': {
      const col = c.dad;
      const outfit = spec.style.dad.outfit;
      let s = body(col);
      s += neck(g, c, 0.32);
      if (outfit === 'polo') {
        s += collar(g, top, lighten(col, 0.25), 0.9);
        for (let i = 0; i < 2; i++) s += circle(g.cx, top + 32 + i * 14, 3.2, lighten(col, 0.5));
        return s;
      }
      s += path(
        d`M${g.cx - 20} ${top + 4} L${g.cx + 20} ${top + 4} L${g.cx} ${top + 40} Z`,
        '#FFFFFF',
      );
      s += collar(g, top, '#FFFFFF', 1);
      if (outfit === 'tie') {
        s += path(
          d`M${g.cx - 6} ${top + 14} L${g.cx + 6} ${top + 14} L${g.cx + 3} ${top + 20} L${g.cx + 10} ${top + 62} L${g.cx} ${top + 74} L${g.cx - 10} ${top + 62} L${g.cx - 3} ${top + 20} Z`,
          c.accent,
        );
        s += path(
          d`M${g.cx - 7} ${top + 8} L${g.cx + 7} ${top + 8} L${g.cx + 5} ${top + 19} L${g.cx - 5} ${top + 19} Z`,
          darken(c.accent, 0.15),
        );
      } else {
        s += bowtie(g.cx, top + 16, 1.15, c.accent);
      }
      return s;
    }
    case 'grandma': {
      const col = c.grandma;
      let s = body(col);
      // blouse V + pearls + cardigan buttons
      s += path(
        d`M${g.cx - g.rx * 0.6} ${top} L${g.cx + g.rx * 0.6} ${top} L${g.cx} ${top + 56} Z`,
        '#FFF7EC',
      );
      s += ellipse(g.cx, top - 2, g.rx * 0.4, 20, c.fur);
      s += line(
        d`M${g.cx - g.rx * 0.6} ${top} L${g.cx} ${top + 56} L${g.cx + g.rx * 0.6} ${top}`,
        darken(col, 0.18),
        5,
      );
      for (let i = 0; i < 2; i++) s += circle(g.cx + 9, top + 66 + i * 16, 3.4, lighten(col, 0.45));
      const n = 9;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = Math.PI * (0.15 + 0.7 * t);
        const px = g.cx - Math.cos(a) * g.rx * 0.46;
        const py = top + 2 + Math.sin(a) * 22;
        s += circle(px, py, 4.6, '#FFFDF7') + circle(px - 1.2, py - 1.4, 1.4, '#FFFFFF');
      }
      return s;
    }
    case 'grandpa': {
      const col = c.grandpa;
      let s = body(col);
      s += path(
        d`M${g.cx - g.rx * 0.55} ${top} L${g.cx + g.rx * 0.55} ${top} L${g.cx} ${top + 62} Z`,
        '#F4F1EA',
      );
      s += neck(g, c, 0.3);
      s += collar(g, top, '#FFFFFF', 0.95);
      s += line(
        d`M${g.cx - g.rx * 0.55} ${top + 2} L${g.cx} ${top + 62} L${g.cx + g.rx * 0.55} ${top + 2}`,
        darken(col, 0.2),
        6,
      );
      for (let i = 0; i < 2; i++) s += circle(g.cx, top + 74 + i * 15, 3.6, lighten(col, 0.4));
      // bow tie on every other species, open collar otherwise
      if (index % 2 === 1) s += bowtie(g.cx, top + 16, 0.9, c.accent);
      return s;
    }
  }
  return '';
}

function collar(g, top, col, k) {
  const w = 30 * k;
  return (
    soft(
      d`M${g.cx - 3} ${top + 6} L${g.cx - w} ${top - 6} L${g.cx - w * 0.9} ${top + 18} Z`,
      col,
      4,
    ) +
    soft(
      d`M${g.cx + 3} ${top + 6} L${g.cx + w} ${top - 6} L${g.cx + w * 0.9} ${top + 18} Z`,
      col,
      4,
    )
  );
}

function bowtie(x, y, k, col) {
  const w = 18 * k;
  const h = 11 * k;
  return (
    soft(d`M${x} ${y} L${x - w} ${y - h} L${x - w} ${y + h} Z`, col, 5) +
    soft(d`M${x} ${y} L${x + w} ${y - h} L${x + w} ${y + h} Z`, col, 5) +
    circle(x, y, 5.5 * k, darken(col, 0.2))
  );
}

function heart(x, y, r, col) {
  return path(
    d`M${x} ${y + r} C${x - r * 2} ${y - r * 0.2} ${x - r * 0.9} ${y - r * 1.6} ${x} ${y - r * 0.5} C${x + r * 0.9} ${y - r * 1.6} ${x + r * 2} ${y - r * 0.2} ${x} ${y + r} Z`,
    col,
  );
}

// ---------------------------------------------------------------------------
// head accessories
// ---------------------------------------------------------------------------

function headTop(g) {
  return g.cy - g.ry;
}

function teenHat(spec, g, c) {
  const kind = spec.style.teen;
  if (kind === 'headphones') {
    const band = '#2D3047';
    const cup = c.accent;
    const r = g.rx * 1.06;
    const y0 = g.cy - g.ry * 0.05;
    let s = line(
      d`M${g.cx - r} ${y0} C${g.cx - r} ${g.cy - g.ry * 1.45} ${g.cx + r} ${g.cy - g.ry * 1.45} ${g.cx + r} ${y0}`,
      band,
      9,
    );
    for (const side of [-1, 1]) {
      const x = g.cx + side * r;
      s += ellipse(x, y0 + 8, 13, 22, band);
      s += ellipse(x + side * 2, y0 + 8, 9, 17, cup);
    }
    return s;
  }
  if (kind === 'beanie') {
    const col = c.accent;
    const y = g.cy - g.ry * 0.42;
    let s = path(
      d`M${g.cx - g.rx * 0.94} ${y} C${g.cx - g.rx * 0.95} ${g.cy - g.ry * 1.3} ${g.cx + g.rx * 0.95} ${g.cy - g.ry * 1.3} ${g.cx + g.rx * 0.94} ${y} Z`,
      col,
    );
    s += soft(
      d`M${g.cx - g.rx * 0.98} ${y - 6} Q${g.cx} ${y - 20} ${g.cx + g.rx * 0.98} ${y - 6} L${g.cx + g.rx * 0.98} ${y + 8} Q${g.cx} ${y - 6} ${g.cx - g.rx * 0.98} ${y + 8} Z`,
      darken(col, 0.18),
      8,
    );
    for (let i = -2; i <= 2; i++)
      s += line(
        d`M${g.cx + i * g.rx * 0.3} ${y - 12 + Math.abs(i) * 3} L${g.cx + i * g.rx * 0.24} ${g.cy - g.ry * 0.95 + Math.abs(i) * 6}`,
        darken(col, 0.1),
        3,
      );
    s +=
      circle(g.cx, g.cy - g.ry * 1.1, 13, '#FFFFFF') +
      circle(g.cx + 3, g.cy - g.ry * 1.1 + 3, 9, '#EDEAF5');
    return s;
  }
  // cap, brim to the side
  const col = c.accent;
  const y = g.cy - g.ry * 0.5;
  let s = path(
    d`M${g.cx - g.rx * 0.9} ${y} C${g.cx - g.rx * 0.92} ${g.cy - g.ry * 1.22} ${g.cx + g.rx * 0.92} ${g.cy - g.ry * 1.22} ${g.cx + g.rx * 0.9} ${y} Q${g.cx} ${y - 10} ${g.cx - g.rx * 0.9} ${y} Z`,
    col,
  );
  s += soft(
    d`M${g.cx + g.rx * 0.2} ${y - 4} Q${g.cx + g.rx * 0.9} ${y - 18} ${g.cx + g.rx * 1.35} ${y - 2} Q${g.cx + g.rx * 0.9} ${y + 6} ${g.cx + g.rx * 0.2} ${y + 2} Z`,
    darken(col, 0.2),
    6,
  );
  s += line(d`M${g.cx} ${g.cy - g.ry * 1.02} L${g.cx} ${y - 6}`, darken(col, 0.15), 3);
  s += circle(g.cx, g.cy - g.ry * 1.03, 5, darken(col, 0.15));
  s += circle(g.cx - g.rx * 0.42, g.cy - g.ry * 0.76, 9, '#FFFFFF', { opacity: 0.9 });
  s += path(d`M${g.cx - g.rx * 0.42 - 4} ${g.cy - g.ry * 0.76 - 1} l4 -4 l0 9`, 'none', {
    stroke: col,
    'stroke-width': 2.4,
    'stroke-linecap': 'round',
  });
  return s;
}

function momHead(spec, g, c) {
  const kind = spec.style.mom.head;
  const accent = c.accent;
  const [x, y] = [g.cx + g.rx * 0.5, headTop(g) + g.ry * 0.12];
  switch (kind) {
    case 'bow':
      return group(bow(0, 0, 1, accent), `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(18)`);
    case 'flower': {
      let s = '';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        s += circle(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, accent);
      }
      return s + circle(x, y, 6.5, '#FFE066');
    }
    case 'headband': {
      const yb = g.cy - g.ry * 0.62;
      return (
        line(
          d`M${g.cx - g.rx * 0.8} ${yb + 10} Q${g.cx} ${g.cy - g.ry * 1.08} ${g.cx + g.rx * 0.8} ${yb + 10}`,
          accent,
          8,
        ) +
        group(
          bow(0, 0, 0.7, accent),
          `translate(${(g.cx + g.rx * 0.48).toFixed(1)} ${(yb - 6).toFixed(1)}) rotate(20)`,
        )
      );
    }
    case 'bun':
    default: {
      const hair = c.hair;
      const bx = g.cx;
      const by = headTop(g) - 6;
      return (
        circle(bx, by, 20, darken(hair, 0.1)) +
        circle(bx - 3, by - 3, 17, hair) +
        line(d`M${bx - 18} ${by + 12} Q${bx} ${by + 20} ${bx + 18} ${by + 12}`, accent, 6)
      );
    }
  }
}

function group(content, transform) {
  return `<g transform="${transform}">${content}</g>`;
}

function bow(x, y, k, col) {
  const w = 20 * k;
  const h = 14 * k;
  return (
    soft(
      d`M${x} ${y} Q${x - w * 0.6} ${y - h * 1.3} ${x - w} ${y - h * 0.6} Q${x - w * 1.1} ${y + h * 0.6} ${x} ${y} Z`,
      col,
      6,
    ) +
    soft(
      d`M${x} ${y} Q${x + w * 0.6} ${y - h * 1.3} ${x + w} ${y - h * 0.6} Q${x + w * 1.1} ${y + h * 0.6} ${x} ${y} Z`,
      col,
      6,
    ) +
    circle(x, y, 6 * k, darken(col, 0.18))
  );
}

function earrings(spec, g, c) {
  const kind = spec.style.mom.earrings;
  let s = '';
  for (const side of [-1, 1]) {
    const x = g.cx + side * g.rx * 0.9;
    const y = g.cy + g.ry * 0.36;
    if (kind === 'hoop')
      s += circle(x, y + 9, 8, 'none', { stroke: '#FFC23D', 'stroke-width': 3.4 });
    else if (kind === 'pearl')
      s += circle(x, y + 4, 6, '#FFFDF7') + circle(x - 1.6, y + 2.4, 1.8, '#FFFFFF');
    else if (kind === 'drop')
      s +=
        line(d`M${x} ${y} L${x} ${y + 8}`, '#FFC23D', 2.4) +
        path(
          d`M${x} ${y + 6} Q${x + 7} ${y + 16} ${x} ${y + 20} Q${x - 7} ${y + 16} ${x} ${y + 6} Z`,
          c.accent,
        );
    else s += star(x, y + 6, 7.5, '#FFC23D');
  }
  return s;
}

function star(x, y, r, col) {
  let pd = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    pd +=
      (i === 0 ? 'M' : 'L') +
      `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)} `;
  }
  return soft(pd + 'Z', col, 2.5);
}

/** Facial hair anchored between nose and mouth. */
function facialHair(spec, g, kind, col) {
  const x = g.cx;
  const beakBottom = spec.beakBottom?.(g);
  const y = beakBottom
    ? beakBottom + 4
    : spec.mustacheY
      ? g.cy + g.ry * spec.mustacheY
      : (g.noseY + g.mouthY) / 2 + 3;
  const w = g.rx * 0.36;
  const shade = darken(col, 0.12);
  switch (kind) {
    case 'brush':
      return soft(
        d`M${x - w * 0.8} ${y - 4} Q${x} ${y - 10} ${x + w * 0.8} ${y - 4} Q${x + w * 0.85} ${y + 8} ${x} ${y + 5} Q${x - w * 0.85} ${y + 8} ${x - w * 0.8} ${y - 4} Z`,
        col,
        6,
      );
    case 'chevron':
      return soft(
        d`M${x} ${y - 7} Q${x + w * 0.6} ${y - 8} ${x + w} ${y + 6} Q${x + w * 0.5} ${y + 2} ${x} ${y + 3} Q${x - w * 0.5} ${y + 2} ${x - w} ${y + 6} Q${x - w * 0.6} ${y - 8} ${x} ${y - 7} Z`,
        col,
        5,
      );
    case 'walrus':
      return (
        soft(
          d`M${x} ${y - 8} Q${x + w * 0.9} ${y - 10} ${x + w * 1.05} ${y + 14} Q${x + w * 0.5} ${y + 8} ${x} ${y + 6} Q${x - w * 0.5} ${y + 8} ${x - w * 1.05} ${y + 14} Q${x - w * 0.9} ${y - 10} ${x} ${y - 8} Z`,
          col,
          6,
        ) +
        line(d`M${x - w * 0.5} ${y} l2 8 M${x + w * 0.5} ${y} l-2 8 M${x} ${y - 2} l0 8`, shade, 2)
      );
    case 'handlebar':
    case 'curly': {
      const curl = kind === 'curly';
      let s = soft(
        d`M${x} ${y - 5} Q${x + w * 0.5} ${y - 9} ${x + w * 0.85} ${y + 1} Q${x + w * 1.05} ${y + 4} ${x + w * 1.2} ${y - 6} Q${x + w * 1.1} ${y + 10} ${x + w * 0.7} ${y + 7} Q${x + w * 0.3} ${y + 4} ${x} ${y + 5}
          Q${x - w * 0.3} ${y + 4} ${x - w * 0.7} ${y + 7} Q${x - w * 1.1} ${y + 10} ${x - w * 1.2} ${y - 6} Q${x - w * 1.05} ${y + 4} ${x - w * 0.85} ${y + 1} Q${x - w * 0.5} ${y - 9} ${x} ${y - 5} Z`,
        col,
        4,
      );
      if (curl)
        s +=
          circle(x - w * 1.18, y - 9, 4.5, 'none', { stroke: col, 'stroke-width': 3.6 }) +
          circle(x + w * 1.18, y - 9, 4.5, 'none', { stroke: col, 'stroke-width': 3.6 });
      return s;
    }
    case 'goatee': {
      const gy = beakBottom ? beakBottom + 10 : g.mouthY + 8;
      return (
        soft(
          d`M${x - 12} ${gy} Q${x} ${gy - 4} ${x + 12} ${gy} Q${x + 8} ${gy + 20} ${x} ${gy + 26} Q${x - 8} ${gy + 20} ${x - 12} ${gy} Z`,
          col,
          5,
        ) +
        soft(
          d`M${x - w * 0.55} ${y} Q${x} ${y - 7} ${x + w * 0.55} ${y} Q${x} ${y + 3} ${x - w * 0.55} ${y} Z`,
          col,
          5,
        )
      );
    }
    case 'featherBeard':
    case 'beard': {
      // beard wraps the jaw; the mouth stays visible
      const feather = kind === 'featherBeard';
      const top = g.cy + g.ry * (feather ? 0.42 : 0.12);
      const my = beakBottom ? beakBottom + 2 : g.mouthY + 7;
      const bottom = g.cy + g.ry * (feather ? 1.1 : 1.18);
      const ww = g.rx * (feather ? 0.62 : 0.88);
      let s = soft(
        d`M${x - ww} ${top} Q${x - ww * 1.02} ${bottom - 6} ${x} ${bottom} Q${x + ww * 1.02} ${bottom - 6} ${x + ww} ${top}
          Q${x + ww * 0.7} ${my + 4} ${x + g.mouthW * 1.4} ${my} Q${x} ${my + 8} ${x - g.mouthW * 1.4} ${my} Q${x - ww * 0.7} ${my + 4} ${x - ww} ${top} Z`,
        col,
        6,
      );
      if (kind === 'featherBeard') {
        for (const [dx, dy] of [
          [-0.4, 0.82],
          [0, 0.95],
          [0.4, 0.82],
        ])
          s += line(d`M${x + ww * dx - 7} ${g.cy + g.ry * dy} q7 8 14 0`, shade, 3.4);
      } else {
        s += line(
          d`M${x - ww * 0.4} ${g.cy + g.ry * 0.85} q4 7 8 0 M${x + ww * 0.32} ${g.cy + g.ry * 0.85} q4 7 8 0 M${x - 4} ${g.cy + g.ry * 1.0} q4 7 8 0`,
          shade,
          2.6,
        );
      }
      if (!beakBottom) s += facialHair(spec, g, 'brush', col);
      return s;
    }
  }
  return '';
}

function glasses(spec, g, kind, frame) {
  const pos = eyePositions(spec, g);
  const big =
    spec.eyes === 'owl' ? owlEyeR(g) * 1.08 : spec.eyes === 'frog' ? g.rx * 0.28 : g.eyeRx * 2;
  let s = '';
  for (const [x, y] of pos) {
    if (kind === 'round')
      s += circle(x, y, big, '#FFFFFF', {
        'fill-opacity': 0.22,
        stroke: frame,
        'stroke-width': 4.2,
      });
    else
      s += `<rect x="${(x - big * 1.1).toFixed(1)}" y="${(y - big * 0.8).toFixed(1)}" width="${(big * 2.2).toFixed(1)}" height="${(big * 1.6).toFixed(1)}" rx="${(big * 0.45).toFixed(1)}" fill="#FFFFFF" fill-opacity="0.22" stroke="${frame}" stroke-width="4.2"/>`;
  }
  const [l, r] = pos;
  const hw = kind === 'round' ? big : big * 1.1;
  s += line(d`M${l[0] + hw} ${l[1] - 2} Q${g.cx} ${l[1] - 9} ${r[0] - hw} ${r[1] - 2}`, frame, 3.6);
  // temples to the head outline
  s += line(d`M${l[0] - hw} ${l[1] - 2} L${g.cx - g.rx * 0.97} ${l[1] - 6}`, frame, 3.2);
  s += line(d`M${r[0] + hw} ${r[1] - 2} L${g.cx + g.rx * 0.97} ${r[1] - 6}`, frame, 3.2);
  return s;
}

function greyCurls(spec, g, c) {
  const t = headTop(g);
  const ears = spec.key === 'rabbit' || spec.key === 'unicorn';
  let s = '';
  const rr = 11;
  const pts = [
    [-0.42, 0.16],
    [-0.21, 0.04],
    [0, 0],
    [0.21, 0.04],
    [0.42, 0.16],
    [-0.3, -0.1],
    [-0.08, -0.14],
    [0.14, -0.14],
    [0.34, -0.08],
  ];
  for (const [dx, dy] of pts)
    s += circle(g.cx + dx * g.rx * 1.25 + 1.5, t + dy * 60 + 12 + 2, rr, c.greyShade);
  for (const [dx, dy] of pts) s += circle(g.cx + dx * g.rx * 1.25, t + dy * 60 + 12, rr, c.grey);
  for (const [dx, dy] of pts)
    s += circle(g.cx + dx * g.rx * 1.25 - 3, t + dy * 60 + 9, 3, '#FFFFFF', { opacity: 0.7 });
  return ears ? s.replace(/<circle/g, '<circle') : s;
}

function greyBun(g, c) {
  const t = headTop(g);
  let s = circle(g.cx + 2, t - 4, 20, c.greyShade) + circle(g.cx, t - 7, 19, c.grey);
  s += circle(g.cx - 6, t - 13, 4, '#FFFFFF', { opacity: 0.7 });
  // little fringe of curls across the forehead
  for (const dx of [-0.45, -0.22, 0, 0.22, 0.45]) {
    const x = g.cx + dx * g.rx;
    const y = t + 12 + Math.abs(dx) * 22;
    s += circle(x + 1.5, y + 2, 10, c.greyShade) + circle(x, y, 10, c.grey);
  }
  return s;
}

function flatCap(g, c) {
  const col = darken(c.grandpa, 0.25);
  const y = g.cy - g.ry * 0.5;
  let s = path(
    d`M${g.cx - g.rx * 0.98} ${y + 4} C${g.cx - g.rx * 1.02} ${g.cy - g.ry * 1.18} ${g.cx + g.rx * 1.02} ${g.cy - g.ry * 1.22} ${g.cx + g.rx * 0.98} ${y + 4} Z`,
    col,
  );
  s += line(
    d`M${g.cx - g.rx * 0.5} ${g.cy - g.ry * 0.98} Q${g.cx} ${g.cy - g.ry * 0.86} ${g.cx + g.rx * 0.5} ${g.cy - g.ry * 0.98}`,
    lighten(col, 0.18),
    3,
  );
  s += soft(
    d`M${g.cx - g.rx * 0.8} ${y} Q${g.cx} ${y - 12} ${g.cx + g.rx * 0.8} ${y} Q${g.cx} ${y + 14} ${g.cx - g.rx * 0.8} ${y} Z`,
    darken(col, 0.18),
    6,
  );
  s += circle(g.cx, g.cy - g.ry * 1.06, 4, lighten(col, 0.2));
  return s;
}

// ---------------------------------------------------------------------------
// compose
// ---------------------------------------------------------------------------

export function compose(spec, v, index) {
  const g = geometry(spec, v);
  const c = colors(spec, v, index);
  const parts = [];
  if (spec.back) parts.push(spec.back(g, c, spec));
  parts.push(spec.body ? spec.body(g, c, spec) : defaultBody(g, c));
  parts.push(clothes(spec, g, c, index));
  parts.push(spec.head ? spec.head(g, c, spec) : blob(g.cx, g.cy, g.rx, g.ry, c.fur, c.shade));
  if (spec.face) parts.push(spec.face(g, c, spec));
  parts.push(cheeks(spec, g, c));
  parts.push(eyes(spec, g, c));
  if (spec.mouthBehindNose) parts.push(mouth(spec, g, c));
  if (spec.nose) parts.push(spec.nose(g, c, spec));
  if (!spec.mouthBehindNose) parts.push(mouth(spec, g, c));
  if (spec.whiskers) parts.push(whiskers(g, c.dark));
  if (spec.top) parts.push(spec.top(g, c, spec));

  const st = spec.style;
  switch (v) {
    case 'teen':
      parts.push(teenHat(spec, g, c));
      break;
    case 'mom':
      parts.push(momHead(spec, g, c), earrings(spec, g, c));
      break;
    case 'dad':
      parts.push(brows(spec, g, darken(c.hair, 0.1), false));
      parts.push(facialHair(spec, g, st.dad.hair, c.hair));
      break;
    case 'grandma':
      parts.push(index % 3 === 2 ? greyBun(g, c) : greyCurls(spec, g, c));
      parts.push(glasses(spec, g, 'round', GRANDMA_FRAMES[index % GRANDMA_FRAMES.length]));
      parts.push(earrings({ ...spec, style: { ...st, mom: { earrings: 'pearl' } } }, g, c));
      break;
    case 'grandpa':
      parts.push(
        glasses(spec, g, st.grandpa.glasses, GRANDPA_FRAMES[index % GRANDPA_FRAMES.length]),
      );
      parts.push(brows(spec, g, '#F4F2F8', true));
      parts.push(facialHair(spec, g, st.grandpa.hair === 'beard' ? 'beard' : 'walrus', '#F4F2F8'));
      if (FLATCAP.has(spec.key)) parts.push(flatCap(g, c));
      break;
  }
  const body = parts.join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${body}</svg>`;
}

export { rot };
