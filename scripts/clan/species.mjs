/**
 * The 22 Clan species. Every drawing is relative to the head geometry `g` (centre cx/cy, radii
 * rx/ry, eye/nose/mouth anchors) so all variants share proportions. Hooks (all optional):
 *   back(g, c)   behind the head: ears, mane, horns, quills, shell
 *   body(g, c)   shoulders (default: fur shoulders, belly patch for kids)
 *   head(g, c)   head shape (default: soft-shaded ellipse)
 *   face(g, c)   markings and muzzle (stripes, patches, mask, spots)
 *   nose(g, c)   nose / beak / trunk
 *   top(g, c)    in front of everything species-specific (horn, forelock, hair tuft)
 * `c` holds the resolved colours for the variant (grandparents' fur is silvered).
 * Variant choices per species (teen hat, mom headpiece/earrings, dad facial hair/outfit,
 * grandpa beard/glasses) are listed in `style` so families of different species don't look alike.
 */
import { blob, circle, d, ellipse, group, line, onEllipse, path, rot, soft } from './lib.mjs';

const INK = '#1B2A4A';

/** Ollie-style disc eyes: white eye radius (the facial disc is 1.27×). */
export const owlEyeR = (g) => g.rx * (g.v === 'kid' ? 0.33 : 0.3);

// ---------------------------------------------------------------------------
// shared parts
// ---------------------------------------------------------------------------

/** Pointed ear rooted on the head outline at `angle` (deg from top, mirrored by side). */
function pointEar(g, side, o) {
  const a = o.angle * side;
  const [bx, by] = onEllipse(g.cx, g.cy, g.rx, g.ry, a, o.root ?? 0.8);
  const dir = ((a + (o.tilt ?? 0) * side) * Math.PI) / 180;
  const ux = Math.sin(dir);
  const uy = -Math.cos(dir);
  const px = -uy;
  const py = ux;
  const at = (t, w) => [bx + ux * o.len * t + px * w, by + uy * o.len * t + py * w];
  const tri = (t0, t1, w0) => {
    const p1 = at(t0, w0);
    const p2 = at(t0, -w0);
    const p3 = at(t1, 0);
    return d`M${p1[0]} ${p1[1]} L${p3[0]} ${p3[1]} L${p2[0]} ${p2[1]} Z`;
  };
  let s = soft(tri(0, 1, o.width), o.fill, o.round ?? 12);
  if (o.inner) s += soft(tri(0.18, 0.8, o.width * 0.52), o.inner, 6);
  if (o.tip) s += soft(tri(0.74, 1, o.width * 0.26), o.tip, (o.round ?? 12) * 0.7);
  return s;
}

/** Round ear centred on the head outline. */
function roundEar(g, side, o) {
  const [x, y] = onEllipse(g.cx, g.cy, g.rx, g.ry, o.angle * side, o.k ?? 0.92);
  let s = circle(x, y, o.r, o.fill);
  if (o.inner) {
    const [ix, iy] = onEllipse(g.cx, g.cy, g.rx, g.ry, o.angle * side, (o.k ?? 0.92) + 0.03);
    s += circle(ix, iy, o.r * (o.innerK ?? 0.58), o.inner);
  }
  return s;
}

/** Fluffy cloud ring (mane, quills base, curls): circles along an ellipse. */
export function puffRing(cx, cy, rx, ry, from, to, n, r, fill) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * i) / (n - 1 || 1);
    const [x, y] = onEllipse(cx, cy, rx, ry, a);
    s += circle(x, y, r, fill);
  }
  return s;
}

/** Small rounded nose (muzzle species). */
function nose(g, color, w = 1, h = 1) {
  const x = g.cx;
  const y = g.noseY;
  const nw = g.rx * 0.13 * w;
  const nh = g.ry * 0.085 * h;
  return (
    soft(
      d`M${x - nw} ${y - nh * 0.6} Q${x} ${y - nh * 1.1} ${x + nw} ${y - nh * 0.6} Q${x + nw * 0.7} ${y + nh * 0.7} ${x} ${y + nh * 0.9} Q${x - nw * 0.7} ${y + nh * 0.7} ${x - nw} ${y - nh * 0.6} Z`,
      color,
      5,
    ) + ellipse(x - nw * 0.3, y - nh * 0.45, nw * 0.32, nh * 0.22, '#FFFFFF', { opacity: 0.45 })
  );
}

function whiskers(g, color, n = 2) {
  let s = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const y = g.noseY + 6 + i * 7;
      const x0 = g.cx + side * g.rx * 0.36;
      const x1 = g.cx + side * g.rx * 0.78;
      s += line(
        d`M${x0} ${y} Q${(x0 + x1) / 2} ${y - 3 + i * 3} ${x1} ${y - 4 + i * 6}`,
        color,
        2.2,
        {
          opacity: 0.55,
        },
      );
    }
  }
  return s;
}

/** Two-puff muzzle (cats, tigers, dogs …). */
function puffMuzzle(g, color, k = 1) {
  const y = g.noseY + g.ry * 0.12;
  const rx = g.rx * 0.24 * k;
  const ry = g.ry * 0.2 * k;
  return ellipse(g.cx - rx * 0.78, y, rx, ry, color) + ellipse(g.cx + rx * 0.78, y, rx, ry, color);
}

function defaultBody(g, c) {
  let s = blob(g.cx, g.bodyTop + 86, g.bodyRx, 90, c.fur, c.shade);
  if (g.v === 'kid') s += ellipse(g.cx, g.bodyTop + 74, g.bodyRx * 0.5, 50, c.light);
  return s;
}

// ---------------------------------------------------------------------------
// species
// ---------------------------------------------------------------------------

export const SPECIES = [
  {
    key: 'fox',
    en: 'Fox',
    fr: 'Renard',
    colors: {
      fur: '#F27B35',
      light: '#FFF4E6',
      dark: '#3B2A2A',
      inner: '#FFE0C2',
      hair: '#B5531E',
    },
    style: {
      teen: 'headphones',
      mom: { head: 'bow', earrings: 'hoop' },
      dad: { hair: 'chevron', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          pointEar(g, s, {
            angle: 40,
            len: g.ry * 0.82,
            width: g.rx * 0.32,
            tilt: -6,
            fill: c.fur,
            inner: c.inner,
            tip: c.dark,
          }),
        )
        .join(''),
    face: (g, c) =>
      // white cheek ruffs sweeping up from the jaw + muzzle
      [-1, 1]
        .map((s) =>
          soft(
            d`M${g.cx + s * g.rx * 0.98} ${g.cy + g.ry * 0.1}
              Q${g.cx + s * g.rx * 0.55} ${g.cy + g.ry * 0.1} ${g.cx + s * g.rx * 0.08} ${g.noseY - 4}
              L${g.cx} ${g.cy + g.ry * 0.98}
              Q${g.cx + s * g.rx * 0.8} ${g.cy + g.ry * 0.9} ${g.cx + s * g.rx * 0.98} ${g.cy + g.ry * 0.1} Z`,
            c.light,
            6,
          ),
        )
        .join(''),
    nose: (g, c) => nose(g, c.dark),
    mouth: 'muzzle',
  },
  {
    key: 'owl',
    en: 'Owl',
    fr: 'Hibou',
    // Ollie: owl orange, disc orange, cream belly, yellow beak, navy eyes (assets/brand/owl.svg).
    colors: {
      fur: '#FF8A3D',
      shade: '#EE7A30',
      light: '#FFE9C9',
      dark: '#E8742A',
      beak: '#FFC83D',
      feather: '#F2A15F',
      hair: '#C95F1E',
    },
    eyes: 'owl',
    noCheeks: true,
    style: {
      teen: 'cap',
      mom: { head: 'flower', earrings: 'pearl' },
      dad: { hair: 'featherBeard', outfit: 'bowtie' },
      grandpa: { hair: 'beard', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          pointEar(g, s, {
            angle: 42,
            len: g.ry * 0.4,
            width: g.rx * 0.25,
            tilt: -10,
            fill: c.fur,
            root: 0.86,
            round: 16,
          }),
        )
        .join(''),
    body: (g, c) => {
      let s = '';
      // wings
      for (const side of [-1, 1]) {
        s += ellipse(g.cx + side * g.bodyRx * 0.86, g.bodyTop + 60, g.bodyRx * 0.3, 58, c.dark, {
          transform: rot(side * 16, g.cx + side * g.bodyRx * 0.86, g.bodyTop + 60),
        });
      }
      s += blob(g.cx, g.bodyTop + 86, g.bodyRx * 0.86, 90, c.fur, c.shade);
      if (g.v === 'kid') {
        s += ellipse(g.cx, g.bodyTop + 66, g.bodyRx * 0.5, 46, c.light);
        const y = g.bodyTop + 44;
        s += line(
          d`M${g.cx - 22} ${y} q8 9 16 0 M${g.cx + 6} ${y} q8 9 16 0 M${g.cx - 8} ${y + 17} q8 9 16 0`,
          c.feather,
          4.5,
        );
      }
      return s;
    },
    head: (g, c) => blob(g.cx, g.cy, g.rx * 1.02, g.ry, c.fur, c.shade),
    face: (g, c) => {
      const r = owlEyeR(g) * 1.27;
      return circle(g.cx - g.eyeDx, g.eyeY, r, c.dark) + circle(g.cx + g.eyeDx, g.eyeY, r, c.dark);
    },
    nose: (g, c) => {
      const y = g.eyeY + owlEyeR(g) * 0.95;
      const w = g.rx * 0.11;
      return soft(d`M${g.cx - w} ${y} L${g.cx + w} ${y} L${g.cx} ${y + w * 1.05} Z`, c.beak, 7);
    },
    mouth: 'beak',
    beakBottom: (g) => g.eyeY + owlEyeR(g) * 0.95 + g.rx * 0.12,
    eyeSpread: 0.34,
  },
  {
    key: 'panda',
    en: 'Panda',
    fr: 'Panda',
    colors: {
      fur: '#FBFAF7',
      shade: '#DAD8E2',
      light: '#FFFFFF',
      dark: '#2C2A36',
      hair: '#2C2A36',
    },
    eyes: 'patch',
    style: {
      teen: 'beanie',
      mom: { head: 'bun', earrings: 'drop' },
      dad: { hair: 'handlebar', outfit: 'tie' },
      grandpa: { hair: 'beard', glasses: 'rect' },
    },
    back: (g, c) =>
      [-1, 1].map((s) => roundEar(g, s, { angle: 42, r: g.rx * 0.3, fill: c.dark })).join(''),
    body: (g, c) => {
      let s = blob(g.cx, g.bodyTop + 86, g.bodyRx, 90, c.dark, '#22202B');
      if (g.v === 'kid') s += ellipse(g.cx, g.bodyTop + 80, g.bodyRx * 0.48, 50, c.fur);
      return s;
    },
    face: (g, c) =>
      [-1, 1]
        .map((s) =>
          ellipse(g.cx + s * g.eyeDx * 1.05, g.eyeY + 3, g.eyeRx * 1.95, g.eyeRy * 1.75, c.dark, {
            transform: rot(s * 34, g.cx + s * g.eyeDx * 1.05, g.eyeY + 3),
          }),
        )
        .join('') + ellipse(g.cx, g.noseY + g.ry * 0.1, g.rx * 0.34, g.ry * 0.24, '#FFFFFF'),
    nose: (g, c) => nose(g, c.dark, 1.05),
    mouth: 'muzzle',
  },
  {
    key: 'lion',
    en: 'Lion',
    fr: 'Lion',
    colors: {
      fur: '#F7B940',
      light: '#FFEBC2',
      dark: '#5A3420',
      inner: '#E48A3C',
      mane: '#D9692A',
      hair: '#B8521E',
    },
    style: {
      teen: 'cap',
      mom: { head: 'flower', earrings: 'hoop' },
      dad: { hair: 'goatee', outfit: 'tie' },
      grandpa: { hair: 'moustache', glasses: 'rect' },
    },
    back: (g, c) => {
      // Mane: full for dad/grandpa, medium for teen, a tuft for the cub, none for lionesses.
      const mane = { kid: 0, teen: 0.75, mom: 0, dad: 1, grandma: 0, grandpa: 1 }[g.v];
      let s = '';
      if (mane > 0) {
        const k = 1.12 + 0.2 * mane;
        const col = g.v === 'grandpa' ? '#E9DFCF' : c.mane;
        const shade = g.v === 'grandpa' ? '#CFC3B0' : '#BF5620';
        s += puffRing(g.cx, g.cy + 6, g.rx * k, g.ry * k, -150, 150, 13, g.rx * 0.3 * mane, shade);
        s += puffRing(
          g.cx,
          g.cy + 2,
          g.rx * (k - 0.06),
          g.ry * (k - 0.06),
          -150,
          150,
          13,
          g.rx * 0.28 * mane,
          col,
        );
        s += ellipse(g.cx, g.cy + 4, g.rx * (k - 0.1), g.ry * (k - 0.1), col);
      }
      s += [-1, 1]
        .map((sd) =>
          roundEar(g, sd, { angle: 44, r: g.rx * 0.22, fill: c.fur, inner: c.inner, k: 0.95 }),
        )
        .join('');
      return s;
    },
    face: (g, c) => {
      let s = puffMuzzle(g, c.light, 1.05);
      if (g.v === 'kid')
        s += puffRing(
          g.cx,
          g.cy - g.ry * 0.88,
          g.rx * 0.14,
          g.ry * 0.06,
          -90,
          90,
          3,
          g.rx * 0.1,
          c.mane,
        );
      return s;
    },
    nose: (g, c) => nose(g, '#8A4B2B', 1.05),
    mouth: 'muzzle',
  },
  {
    key: 'koala',
    en: 'Koala',
    fr: 'Koala',
    colors: {
      fur: '#A3ABB8',
      shade: '#8C93A3',
      light: '#EEF1F5',
      dark: '#373B4A',
      hair: '#6E7484',
    },
    style: {
      teen: 'headphones',
      mom: { head: 'headband', earrings: 'pearl' },
      dad: { hair: 'brush', outfit: 'polo' },
      grandpa: { hair: 'beard', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map(
          (s) =>
            roundEar(g, s, { angle: 62, r: g.rx * 0.42, fill: c.fur, k: 0.95 }) +
            roundEar(g, s, { angle: 62, r: g.rx * 0.26, fill: c.light, k: 1.02 }),
        )
        .join(''),
    head: (g, c) => blob(g.cx, g.cy, g.rx * 1.04, g.ry * 0.98, c.fur, c.shade),
    face: (g, c) =>
      ellipse(g.cx, g.noseY + g.ry * 0.12, g.rx * 0.3, g.ry * 0.2, c.light, { opacity: 0.6 }),
    nose: (g, c) => {
      const y = g.noseY - g.ry * 0.04;
      return (
        ellipse(g.cx, y, g.rx * 0.17, g.ry * 0.21, c.dark) +
        ellipse(g.cx - g.rx * 0.05, y - g.ry * 0.1, g.rx * 0.05, g.ry * 0.04, '#FFFFFF', {
          opacity: 0.4,
        })
      );
    },
    mouth: 'wide',
    mouthDy: 0.06,
  },
  {
    key: 'penguin',
    en: 'Penguin',
    fr: 'Pingouin',
    colors: {
      fur: '#33415E',
      shade: '#27324B',
      light: '#FFFFFF',
      dark: '#1C2438',
      beak: '#FFA53A',
      hair: '#1C2438',
    },
    style: {
      teen: 'beanie',
      mom: { head: 'bow', earrings: 'drop' },
      dad: { hair: 'handlebar', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    body: (g, c) => {
      let s = '';
      for (const side of [-1, 1])
        s += ellipse(g.cx + side * g.bodyRx * 0.88, g.bodyTop + 66, g.bodyRx * 0.22, 56, c.shade, {
          transform: rot(side * 18, g.cx + side * g.bodyRx * 0.88, g.bodyTop + 66),
        });
      s += blob(g.cx, g.bodyTop + 86, g.bodyRx * 0.86, 90, c.fur, c.shade);
      if (g.v === 'kid') s += ellipse(g.cx, g.bodyTop + 76, g.bodyRx * 0.52, 58, c.light);
      return s;
    },
    face: (g, c) => {
      // heart-shaped white face
      const y = g.eyeY;
      return (
        circle(g.cx - g.eyeDx * 0.95, y, g.rx * 0.43, c.light) +
        circle(g.cx + g.eyeDx * 0.95, y, g.rx * 0.43, c.light) +
        ellipse(g.cx, g.cy + g.ry * 0.38, g.rx * 0.62, g.ry * 0.5, c.light)
      );
    },
    nose: (g, c) => {
      const y = g.noseY - g.ry * 0.08;
      const w = g.rx * 0.16;
      return (
        soft(
          d`M${g.cx - w} ${y} Q${g.cx} ${y - w * 0.5} ${g.cx + w} ${y} L${g.cx} ${y + w * 0.95} Z`,
          c.beak,
          6,
        ) +
        line(
          d`M${g.cx - w * 0.75} ${y + w * 0.25} L${g.cx + w * 0.75} ${y + w * 0.25}`,
          '#E08422',
          2.4,
        )
      );
    },
    mouth: 'beak',
    beakBottom: (g) => g.noseY - g.ry * 0.08 + g.rx * 0.18,
  },
  {
    key: 'tiger',
    en: 'Tiger',
    fr: 'Tigre',
    colors: {
      fur: '#F7913D',
      light: '#FFF5EA',
      dark: '#2E2424',
      inner: '#FFD9BA',
      hair: '#2E2424',
    },
    style: {
      teen: 'cap',
      mom: { head: 'bun', earrings: 'star' },
      dad: { hair: 'walrus', outfit: 'tie' },
      grandpa: { hair: 'beard', glasses: 'rect' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) => roundEar(g, s, { angle: 40, r: g.rx * 0.25, fill: c.fur, inner: c.inner }))
        .join(''),
    face: (g, c) => {
      const s = [];
      // forehead stripes
      const top = g.cy - g.ry;
      s.push(
        soft(
          d`M${g.cx - 6} ${top + 4} L${g.cx + 6} ${top + 4} L${g.cx} ${top + g.ry * 0.36} Z`,
          c.dark,
          4,
        ),
      );
      for (const side of [-1, 1]) {
        const x = g.cx + side * g.rx * 0.32;
        s.push(
          soft(
            d`M${x - 5} ${top + 8} L${x + 5} ${top + 6} L${x + side * 2} ${top + g.ry * 0.28} Z`,
            c.dark,
            4,
          ),
        );
        // cheek stripes from the outline inward
        for (let i = 0; i < 2; i++) {
          const y = g.cy + g.ry * (0.02 + i * 0.22);
          const xo = g.cx + side * g.rx * (1.0 - i * 0.04);
          const xi = g.cx + side * g.rx * (0.62 + i * 0.06);
          s.push(soft(d`M${xo} ${y - 6} L${xi} ${y} L${xo} ${y + 5} Z`, c.dark, 4));
        }
      }
      s.push(puffMuzzle(g, c.light, 1.1));
      s.push(ellipse(g.cx, g.cy + g.ry * 0.78, g.rx * 0.3, g.ry * 0.18, c.light));
      return s.join('');
    },
    nose: (g) => nose(g, '#D9685E', 1.05),
    mouth: 'muzzle',
    whiskers: true,
  },
  {
    key: 'rabbit',
    en: 'Rabbit',
    fr: 'Lapin',
    colors: {
      fur: '#F1E4D8',
      shade: '#D8C4B2',
      light: '#FFFFFF',
      dark: '#4A3A3A',
      inner: '#F7A9BA',
      hair: '#B79A85',
    },
    style: {
      teen: 'headphones',
      mom: { head: 'flower', earrings: 'drop' },
      dad: { hair: 'curly', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) => {
          const x = g.cx + s * g.rx * 0.36;
          const y = g.cy - g.ry * 1.18;
          const t = rot(s * 10, x, y + g.ry * 0.5);
          return (
            ellipse(x, y, g.rx * 0.22, g.ry * 0.6, c.shade, { transform: t }) +
            ellipse(x - 1, y - 2, g.rx * 0.2, g.ry * 0.58, c.fur, { transform: t }) +
            ellipse(x, y + 4, g.rx * 0.1, g.ry * 0.42, c.inner, { transform: t })
          );
        })
        .join(''),
    face: (g, c) => puffMuzzle(g, c.light, 0.95),
    nose: (g, c) => nose(g, '#F27E98', 0.85, 0.85),
    mouth: 'muzzle',
    teeth: true,
    whiskers: true,
  },
  {
    key: 'bear',
    en: 'Bear',
    fr: 'Ours',
    colors: {
      fur: '#A8683C',
      shade: '#8F5631',
      light: '#E9C79C',
      dark: '#3A2418',
      inner: '#E2B386',
      hair: '#5E3720',
    },
    style: {
      teen: 'beanie',
      mom: { head: 'bow', earrings: 'hoop' },
      dad: { hair: 'beard', outfit: 'polo' },
      grandpa: { hair: 'moustache', glasses: 'rect' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) => roundEar(g, s, { angle: 42, r: g.rx * 0.28, fill: c.fur, inner: c.inner }))
        .join(''),
    face: (g, c) => ellipse(g.cx, g.noseY + g.ry * 0.12, g.rx * 0.38, g.ry * 0.28, c.light),
    nose: (g, c) => nose(g, c.dark, 1.2, 1.05),
    mouth: 'muzzle',
  },
  {
    key: 'frog',
    en: 'Frog',
    fr: 'Grenouille',
    colors: {
      fur: '#7BC657',
      shade: '#5EA63F',
      light: '#DDF3C4',
      dark: '#2F4A25',
      hair: '#3F7A2A',
    },
    eyes: 'frog',
    style: {
      teen: 'headphones',
      mom: { head: 'bow', earrings: 'pearl' },
      dad: { hair: 'handlebar', outfit: 'bowtie' },
      grandpa: { hair: 'beard', glasses: 'round' },
    },
    head: (g, c) => blob(g.cx, g.cy + g.ry * 0.12, g.rx * 1.1, g.ry * 0.86, c.fur, c.shade),
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          blob(
            g.cx + s * g.eyeDx * 1.15,
            g.cy - g.ry * 0.5,
            g.rx * 0.36,
            g.rx * 0.34,
            c.fur,
            c.shade,
          ),
        )
        .join(''),
    face: (g, c) =>
      ellipse(g.cx, g.cy + g.ry * 0.62, g.rx * 0.62, g.ry * 0.28, c.light, { opacity: 0.7 }),
    nose: (g, c) =>
      circle(g.cx - 7, g.noseY - 2, 2.6, c.dark, { opacity: 0.7 }) +
      circle(g.cx + 7, g.noseY - 2, 2.6, c.dark, { opacity: 0.7 }),
    mouth: 'wide',
    mouthW: 0.5,
    mouthDy: 0.02,
  },
  {
    key: 'cat',
    en: 'Cat',
    fr: 'Chat',
    colors: {
      fur: '#9DA2C6',
      shade: '#8389B0',
      light: '#F7F6FB',
      dark: '#5D6290',
      inner: '#F6B3C3',
      hair: '#5D6290',
    },
    style: {
      teen: 'cap',
      mom: { head: 'bow', earrings: 'star' },
      dad: { hair: 'curly', outfit: 'tie' },
      grandpa: { hair: 'beard', glasses: 'rect' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          pointEar(g, s, {
            angle: 38,
            len: g.ry * 0.66,
            width: g.rx * 0.34,
            tilt: 4,
            fill: c.fur,
            inner: c.inner,
          }),
        )
        .join(''),
    face: (g, c) => {
      const top = g.cy - g.ry;
      let s = '';
      for (const dx of [-0.2, 0, 0.2]) {
        const x = g.cx + g.rx * dx;
        s += soft(
          d`M${x - 4} ${top + 5} L${x + 4} ${top + 5} L${x} ${top + g.ry * (dx === 0 ? 0.3 : 0.22)} Z`,
          c.dark,
          4,
        );
      }
      for (const side of [-1, 1]) {
        const xo = g.cx + side * g.rx;
        const xi = g.cx + side * g.rx * 0.74;
        const y = g.cy + g.ry * 0.12;
        s += soft(d`M${xo} ${y - 5} L${xi} ${y} L${xo} ${y + 4} Z`, c.dark, 3);
      }
      return (
        s +
        puffMuzzle(g, c.light, 0.95) +
        ellipse(g.cx, g.cy + g.ry * 0.74, g.rx * 0.24, g.ry * 0.15, c.light)
      );
    },
    nose: (g, c) => nose(g, '#F08AA2', 0.8, 0.8),
    mouth: 'muzzle',
    whiskers: true,
  },
  {
    key: 'dog',
    en: 'Dog',
    fr: 'Chien',
    colors: {
      fur: '#E3AB6C',
      shade: '#CC9156',
      light: '#FFF3E2',
      dark: '#2E2220',
      ear: '#8C5530',
      hair: '#7A4826',
    },
    style: {
      teen: 'cap',
      mom: { head: 'headband', earrings: 'hoop' },
      dad: { hair: 'beard', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    head: (g, c) => blob(g.cx, g.cy, g.rx * 0.98, g.ry, c.fur, c.shade),
    face: (g, c) =>
      // brown patch over one eye (beagle-ish) + muzzle
      ellipse(g.cx + g.eyeDx, g.eyeY - 2, g.eyeRx * 2.3, g.eyeRy * 2, c.ear, { opacity: 0.9 }) +
      soft(
        d`M${g.cx - 5} ${g.cy - g.ry * 0.98} L${g.cx + 5} ${g.cy - g.ry * 0.98} L${g.cx + g.rx * 0.12} ${g.noseY} L${g.cx - g.rx * 0.12} ${g.noseY} Z`,
        c.light,
        8,
      ) +
      ellipse(g.cx, g.noseY + g.ry * 0.14, g.rx * 0.4, g.ry * 0.27, c.light),
    top: (g, c) =>
      // floppy ears hang over the sides of the head
      [-1, 1]
        .map((s) => {
          const x = g.cx + s * g.rx * 0.9;
          const y = g.cy - g.ry * 0.12;
          return ellipse(x, y, g.rx * 0.24, g.ry * 0.52, c.ear, {
            transform: rot(s * 16, x, y - g.ry * 0.4),
          });
        })
        .join(''),
    nose: (g, c) => nose(g, c.dark, 1.35, 1.15),
    mouth: 'muzzle',
    tongue: true,
  },
  {
    key: 'unicorn',
    en: 'Unicorn',
    fr: 'Licorne',
    colors: {
      fur: '#FFF6FB',
      shade: '#EBD3E5',
      light: '#FFDDEB',
      dark: '#5B3B63',
      inner: '#FFC1D9',
      horn: '#FFCB45',
      hair: '#B48CFF',
    },
    mane: ['#FF8FB8', '#B48CFF', '#7CC6FF', '#FFD36E'],
    style: {
      teen: 'headphones',
      mom: { head: 'flower', earrings: 'star' },
      dad: { hair: 'goatee', outfit: 'bowtie' },
      grandpa: { hair: 'beard', glasses: 'round' },
    },
    back: (g, c, spec) => {
      let s = [-1, 1]
        .map((sd) =>
          pointEar(g, sd, {
            angle: 34,
            len: g.ry * 0.5,
            width: g.rx * 0.2,
            fill: c.fur,
            inner: c.inner,
          }),
        )
        .join('');
      // flowing mane down the left side
      const cols =
        g.v === 'grandma' || g.v === 'grandpa'
          ? ['#E9E4F2', '#D9D2E8', '#ECE7F5', '#CFC7E0']
          : spec.mane;
      cols.forEach((col, i) => {
        const x = g.cx - g.rx * (0.82 + i * 0.05);
        const y = g.cy - g.ry * 0.5 + i * g.ry * 0.36;
        s += circle(x, y, g.rx * 0.3, col);
      });
      return s;
    },
    head: (g, c) => blob(g.cx, g.cy, g.rx * 0.95, g.ry * 1.02, c.fur, c.shade),
    face: (g, c) => ellipse(g.cx, g.cy + g.ry * 0.58, g.rx * 0.5, g.ry * 0.36, c.light),
    nose: (g, c) =>
      ellipse(g.cx - g.rx * 0.18, g.cy + g.ry * 0.5, 3.4, 4.4, '#E58FB0') +
      ellipse(g.cx + g.rx * 0.18, g.cy + g.ry * 0.5, 3.4, 4.4, '#E58FB0'),
    top: (g, c, spec) => {
      const cols =
        g.v === 'grandma' || g.v === 'grandpa' ? ['#E9E4F2', '#D9D2E8', '#ECE7F5'] : spec.mane;
      const base = g.cy - g.ry * 0.82;
      const w = g.rx * 0.14;
      const h = g.ry * 0.78;
      let s = soft(d`M${g.cx - w} ${base} L${g.cx} ${base - h} L${g.cx + w} ${base} Z`, c.horn, 6);
      for (let i = 1; i <= 3; i++) {
        const y = base - (h * i) / 4;
        const ww = w * (1 - i / 4);
        s += line(d`M${g.cx - ww} ${y + 3} L${g.cx + ww} ${y - 2}`, '#E9A92B', 2.6);
      }
      // forelock curls
      s += circle(g.cx - g.rx * 0.32, base + 4, g.rx * 0.2, cols[0]);
      s += circle(g.cx - g.rx * 0.58, base + 14, g.rx * 0.18, cols[1]);
      s += circle(g.cx + g.rx * 0.2, base + 2, g.rx * 0.15, cols[2]);
      return s;
    },
    mouth: 'wide',
    mouthDy: 0.3,
    mouthW: 0.28,
    noseYOffset: 0.18,
  },
  {
    key: 'dragon',
    en: 'Dragon',
    fr: 'Dragon',
    colors: {
      fur: '#8E6CE2',
      shade: '#7655C8',
      light: '#EFE3FF',
      dark: '#3C2A6B',
      horn: '#FFE3A8',
      spike: '#FFB84D',
      hair: '#4E3A8E',
    },
    style: {
      teen: 'cap',
      mom: { head: 'bun', earrings: 'hoop' },
      dad: { hair: 'chevron', outfit: 'tie' },
      grandpa: { hair: 'beard', glasses: 'rect' },
    },
    back: (g, c) => {
      let s = '';
      // spikes along the crown
      for (const a of [-28, 0, 28]) {
        const [x, y] = onEllipse(g.cx, g.cy, g.rx, g.ry, a, 0.94);
        const t = rot(a, x, y);
        s += soft(d`M${x - 11} ${y + 6} L${x} ${y - 24} L${x + 11} ${y + 6} Z`, c.spike, 8, {
          transform: t,
        });
      }
      for (const side of [-1, 1]) {
        const [x, y] = onEllipse(g.cx, g.cy, g.rx, g.ry, side * 52, 0.9);
        s += soft(
          d`M${x - 8} ${y + 4} Q${x + side * 4} ${y - 30} ${x + side * 26} ${y - 40} Q${x + side * 14} ${y - 18} ${x + 9} ${y + 6} Z`,
          c.horn,
          6,
        );
      }
      return s;
    },
    body: (g, c) => {
      let s = '';
      for (const side of [-1, 1]) {
        const x = g.cx + side * g.bodyRx * 0.95;
        const y = g.bodyTop + 16;
        s += soft(
          d`M${x} ${y + 40} L${x + side * 18} ${y - 18} L${x + side * 4} ${y - 4} L${x - side * 6} ${y - 14} L${x - side * 14} ${y + 30} Z`,
          '#B79BF2',
          8,
        );
      }
      s += blob(g.cx, g.bodyTop + 86, g.bodyRx * 0.92, 90, c.fur, c.shade);
      if (g.v === 'kid') {
        s += ellipse(g.cx, g.bodyTop + 80, g.bodyRx * 0.46, 56, c.light);
        for (let i = 0; i < 3; i++)
          s += line(
            d`M${g.cx - 18 + i} ${g.bodyTop + 38 + i * 15} L${g.cx + 18 - i} ${g.bodyTop + 38 + i * 15}`,
            '#D8C6F5',
            3,
          );
      }
      return s;
    },
    head: (g, c) => blob(g.cx, g.cy, g.rx, g.ry * 0.98, c.fur, c.shade),
    face: (g, c) =>
      ellipse(g.cx, g.cy + g.ry * 0.5, g.rx * 0.56, g.ry * 0.38, c.light) +
      circle(g.cx - g.rx * 0.62, g.cy - g.ry * 0.35, 4, c.shade) +
      circle(g.cx - g.rx * 0.72, g.cy - g.ry * 0.2, 3, c.shade) +
      circle(g.cx + g.rx * 0.66, g.cy - g.ry * 0.3, 4, c.shade),
    nose: (g, c) =>
      ellipse(g.cx - g.rx * 0.15, g.cy + g.ry * 0.38, 3.2, 4.2, c.dark, { opacity: 0.75 }) +
      ellipse(g.cx + g.rx * 0.15, g.cy + g.ry * 0.38, 3.2, 4.2, c.dark, { opacity: 0.75 }),
    mouth: 'wide',
    mouthDy: 0.14,
    mouthW: 0.32,
    noseYOffset: 0.08,
    fang: true,
  },
  {
    key: 'turtle',
    en: 'Turtle',
    fr: 'Tortue',
    colors: {
      fur: '#93D08A',
      shade: '#77B86F',
      light: '#E9F7DF',
      dark: '#2E5A3A',
      shell: '#3F8F63',
      plate: '#5DAE7C',
      rim: '#2F7550',
      hair: '#4C7A4A',
    },
    noEars: true,
    style: {
      teen: 'beanie',
      mom: { head: 'bow', earrings: 'pearl' },
      dad: { hair: 'goatee', outfit: 'polo' },
      grandpa: { hair: 'beard', glasses: 'round' },
    },
    body: (g, c) => {
      // the shell rises behind the shoulders
      const y = g.bodyTop + 40;
      let s = ellipse(g.cx, y, g.bodyRx * 1.12, 80, c.rim);
      s += ellipse(g.cx, y + 2, g.bodyRx * 1.02, 72, c.shell);
      for (const [dx, dy] of [
        [-0.62, -0.1],
        [0.62, -0.1],
        [-0.85, 0.5],
        [0.85, 0.5],
      ]) {
        const x = g.cx + g.bodyRx * dx;
        const yy = y + 50 * dy;
        s += soft(
          d`M${x - 14} ${yy} L${x - 7} ${yy - 12} L${x + 7} ${yy - 12} L${x + 14} ${yy} L${x + 7} ${yy + 12} L${x - 7} ${yy + 12} Z`,
          c.plate,
          5,
        );
      }
      s += blob(g.cx, g.bodyTop + 96, g.bodyRx * 0.72, 86, c.fur, c.shade);
      if (g.v === 'kid') s += ellipse(g.cx, g.bodyTop + 86, g.bodyRx * 0.42, 52, '#F3E7A6');
      return s;
    },
    head: (g, c) => blob(g.cx, g.cy + 4, g.rx * 0.94, g.ry * 0.94, c.fur, c.shade),
    face: (g, c) =>
      circle(g.cx - g.rx * 0.18, g.cy - g.ry * 0.62, 4, c.shade) +
      circle(g.cx + g.rx * 0.08, g.cy - g.ry * 0.72, 3, c.shade) +
      circle(g.cx + g.rx * 0.3, g.cy - g.ry * 0.58, 3.5, c.shade),
    nose: (g, c) =>
      circle(g.cx - 5, g.noseY - 2, 2.2, c.dark, { opacity: 0.6 }) +
      circle(g.cx + 5, g.noseY - 2, 2.2, c.dark, { opacity: 0.6 }),
    mouth: 'wide',
    mouthW: 0.36,
    mouthDy: 0.02,
  },
  {
    key: 'octopus',
    en: 'Octopus',
    fr: 'Pieuvre',
    colors: {
      fur: '#F57EA0',
      shade: '#DE6187',
      light: '#FFD4E0',
      dark: '#5C2338',
      spot: '#E2668B',
      hair: '#7A2346',
    },
    noEars: true,
    style: {
      teen: 'cap',
      mom: { head: 'flower', earrings: 'hoop' },
      dad: { hair: 'curly', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'rect' },
    },
    body: (g, c) => {
      let s = '';
      // curly tentacles peeking out at the sides and bottom
      for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const x0 = g.cx + side * (40 + i * 26);
          const y0 = g.bodyTop - 6 + i * 20;
          const x1 = g.cx + side * (86 + i * 18);
          const y1 = g.bodyTop + 40 + i * 30;
          s += line(
            d`M${x0} ${y0} Q${x0 + side * 40} ${y0 + 4} ${x1} ${y1} q${side * 6} 14 ${-side * 8} 14`,
            c.shade,
            20,
          );
          s += line(
            d`M${x0} ${y0} Q${x0 + side * 40} ${y0 + 4} ${x1} ${y1} q${side * 6} 14 ${-side * 8} 14`,
            c.fur,
            14,
          );
          s += circle(x1 - side * 4, y1 - 10, 2.6, c.light);
          s += circle(x0 + side * 30, y0 + 9, 2.6, c.light);
        }
      }
      s += blob(g.cx, g.bodyTop + 92, g.bodyRx * 0.8, 86, c.fur, c.shade);
      if (g.v === 'kid')
        for (const dx of [-24, 0, 24])
          s += circle(g.cx + dx, g.bodyTop + 50 + Math.abs(dx) * 0.3, 5, c.light);
      return s;
    },
    head: (g, c) => blob(g.cx, g.cy - g.ry * 0.06, g.rx * 0.98, g.ry * 1.08, c.fur, c.shade),
    face: (g, c) =>
      circle(g.cx - g.rx * 0.42, g.cy - g.ry * 0.62, 7, c.spot) +
      circle(g.cx - g.rx * 0.14, g.cy - g.ry * 0.82, 5, c.spot) +
      circle(g.cx + g.rx * 0.38, g.cy - g.ry * 0.7, 8.5, c.spot) +
      circle(g.cx + g.rx * 0.7, g.cy - g.ry * 0.3, 4.5, c.spot),
    mouth: 'wide',
    mouthW: 0.24,
    mouthDy: -0.05,
  },
  {
    key: 'elephant',
    en: 'Elephant',
    fr: 'Éléphant',
    colors: {
      fur: '#9FB2D2',
      shade: '#8498BC',
      light: '#E9EEF8',
      dark: '#2F3C57',
      inner: '#F4B9CB',
      hair: '#5D6E8E',
    },
    style: {
      teen: 'beanie',
      mom: { head: 'bow', earrings: 'pearl' },
      dad: { hair: 'beard', outfit: 'tie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) => {
          const x = g.cx + s * g.rx * 0.98;
          const y = g.cy - g.ry * 0.05;
          return (
            ellipse(x, y, g.rx * 0.5, g.ry * 0.66, c.shade, { transform: rot(s * -12, x, y) }) +
            ellipse(x - s * 2, y - 2, g.rx * 0.46, g.ry * 0.62, c.fur, {
              transform: rot(s * -12, x, y),
            }) +
            ellipse(x + s * 4, y, g.rx * 0.28, g.ry * 0.42, c.inner, {
              transform: rot(s * -12, x, y),
            })
          );
        })
        .join(''),
    mouthBehindNose: true,
    nose: (g, c) => {
      // trunk down the middle, curling up at the tip
      const x = g.cx;
      const y0 = g.eyeY + g.eyeRy * 0.6;
      const y1 = g.cy + g.ry * 0.7;
      const w = g.rx * 0.13;
      const pd = d`M${x - w} ${y0} L${x - w * 0.8} ${y1} Q${x - w * 0.5} ${y1 + w * 2.2} ${x + w * 1.8} ${y1 + w * 0.4}
        Q${x + w * 2.4} ${y1 - w * 0.5} ${x + w * 1.6} ${y1 - w * 0.8} Q${x + w * 0.9} ${y1 + w * 0.2} ${x + w * 0.8} ${y1 - w * 0.6} L${x + w} ${y0} Z`;
      let s = path(pd, c.shade) + path(pd, c.fur, { transform: `translate(-1.5 -1.5)` });
      for (let i = 0; i < 3; i++) {
        const y = g.cy + g.ry * (0.3 + i * 0.13);
        s += line(d`M${x - w * 0.55} ${y} Q${x} ${y + 2.5} ${x + w * 0.55} ${y}`, c.shade, 2);
      }
      if (g.v === 'dad' || g.v === 'grandpa')
        for (const side of [-1, 1])
          s += soft(
            d`M${x + side * w * 1.6} ${y1 - w * 1.5} q${side * 2} ${w * 1.4} ${side * w * 1.2} ${w * 1.6} q${-side * w * 0.5} ${-w * 0.2} ${-side * w * 0.9} ${-w * 1.5} Z`,
            '#FFFFFF',
            3,
          );
      return s;
    },
    mouth: 'wide',
    mouthW: 0.42,
    mouthDy: -0.02,
    mustacheY: 0.66,
  },
  {
    key: 'giraffe',
    en: 'Giraffe',
    fr: 'Girafe',
    colors: {
      fur: '#F6C553',
      shade: '#E2AC3C',
      light: '#FFE9B8',
      dark: '#4A2E1C',
      spot: '#C77933',
      inner: '#F39C6B',
      hair: '#9A5A26',
    },
    style: {
      teen: 'headphones',
      mom: { head: 'bow', earrings: 'drop' },
      dad: { hair: 'goatee', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'rect' },
    },
    back: (g, c) => {
      let s = '';
      for (const side of [-1, 1]) {
        const [bx, by] = onEllipse(g.cx, g.cy, g.rx, g.ry, side * 18, 0.85);
        const tx = bx + side * 6;
        const ty = by - g.ry * 0.55;
        s += line(d`M${bx} ${by} L${tx} ${ty}`, c.spot, 10);
        s += circle(tx, ty, 9, c.spot);
        // leaf ears sticking out sideways
        const [ex, ey] = onEllipse(g.cx, g.cy, g.rx, g.ry, side * 64, 0.95);
        const t = rot(side * 22, ex, ey);
        s += ellipse(ex + side * 12, ey, g.rx * 0.3, g.ry * 0.14, c.fur, { transform: t });
        s += ellipse(ex + side * 14, ey, g.rx * 0.18, g.ry * 0.07, c.inner, { transform: t });
      }
      return s;
    },
    body: (g, c) => {
      let s = blob(g.cx, g.bodyTop + 92, g.bodyRx * 0.86, 90, c.fur, c.shade);
      s += path(
        d`M${g.cx - 40} ${g.bodyTop - 20} L${g.cx + 40} ${g.bodyTop - 20} L${g.cx + 46} ${g.bodyTop + 30} L${g.cx - 46} ${g.bodyTop + 30} Z`,
        c.fur,
      );
      if (g.v === 'kid')
        for (const [dx, dy, r] of [
          [-34, 26, 10],
          [16, 18, 12],
          [-8, 54, 9],
          [44, 54, 10],
          [-56, 62, 8],
        ])
          s += ellipse(g.cx + dx, g.bodyTop + dy, r * 1.2, r, c.spot);
      return s;
    },
    head: (g, c) => blob(g.cx, g.cy, g.rx * 0.9, g.ry * 1.02, c.fur, c.shade),
    face: (g, c) =>
      ellipse(g.cx - g.rx * 0.5, g.cy - g.ry * 0.45, 9, 7, c.spot) +
      ellipse(g.cx + g.rx * 0.55, g.cy - g.ry * 0.5, 7, 6, c.spot) +
      ellipse(g.cx + g.rx * 0.74, g.cy + g.ry * 0.05, 5, 6, c.spot) +
      ellipse(g.cx - g.rx * 0.74, g.cy + g.ry * 0.1, 5, 5, c.spot) +
      ellipse(g.cx, g.cy + g.ry * 0.55, g.rx * 0.5, g.ry * 0.36, c.light),
    nose: (g, c) =>
      ellipse(g.cx - g.rx * 0.17, g.cy + g.ry * 0.42, 3, 4, c.dark, { opacity: 0.7 }) +
      ellipse(g.cx + g.rx * 0.17, g.cy + g.ry * 0.42, 3, 4, c.dark, { opacity: 0.7 }),
    mouth: 'wide',
    mouthDy: 0.2,
    mouthW: 0.26,
    noseYOffset: 0.12,
  },
  {
    key: 'hedgehog',
    en: 'Hedgehog',
    fr: 'Hérisson',
    colors: {
      fur: '#F2D3A9',
      shade: '#DDB98A',
      light: '#FFF1DE',
      dark: '#2E2220',
      quill: '#8A5A3C',
      quillTip: '#B98157',
      inner: '#E8A98E',
      hair: '#7A4C30',
    },
    style: {
      teen: 'headphones',
      mom: { head: 'bow', earrings: 'star' },
      dad: { hair: 'brush', outfit: 'tie' },
      grandpa: { hair: 'beard', glasses: 'round' },
    },
    back: (g, c) => {
      const spikes = (k, col, len) => {
        let pd = '';
        const n = 15;
        for (let i = 0; i <= n; i++) {
          const a = -120 + (240 * i) / n;
          const [x, y] = onEllipse(g.cx, g.cy, g.rx * k, g.ry * k, a);
          const [ox, oy] = onEllipse(g.cx, g.cy, g.rx * (k + len), g.ry * (k + len), a + 120 / n);
          pd += i === 0 ? d`M${x} ${y} ` : d`L${x} ${y} `;
          if (i < n) pd += d`L${ox} ${oy} `;
        }
        pd += d`L${g.cx} ${g.cy + g.ry * 0.4} Z`;
        return soft(pd, col, 6);
      };
      const q = g.v === 'grandma' || g.v === 'grandpa' ? '#A79A92' : c.quill;
      const qt = g.v === 'grandma' || g.v === 'grandpa' ? '#CFC6BF' : c.quillTip;
      return (
        spikes(1.02, qt, 0.36) +
        spikes(0.98, q, 0.26) +
        [-1, 1]
          .map((s) =>
            roundEar(g, s, { angle: 56, r: g.rx * 0.16, fill: c.fur, inner: c.inner, k: 1.0 }),
          )
          .join('')
      );
    },
    head: (g, c) => blob(g.cx, g.cy + 4, g.rx * 0.92, g.ry * 0.92, c.fur, c.shade),
    face: (g, c) =>
      // fringe of quills dipping onto the forehead
      soft(
        d`M${g.cx - g.rx * 0.8} ${g.cy - g.ry * 0.38} Q${g.cx - g.rx * 0.5} ${g.cy - g.ry * 0.62} ${g.cx - g.rx * 0.36} ${g.cy - g.ry * 0.36}
          Q${g.cx - g.rx * 0.18} ${g.cy - g.ry * 0.66} ${g.cx} ${g.cy - g.ry * 0.42} Q${g.cx + g.rx * 0.18} ${g.cy - g.ry * 0.66} ${g.cx + g.rx * 0.36} ${g.cy - g.ry * 0.36}
          Q${g.cx + g.rx * 0.5} ${g.cy - g.ry * 0.62} ${g.cx + g.rx * 0.8} ${g.cy - g.ry * 0.38} L${g.cx + g.rx * 0.6} ${g.cy - g.ry * 0.95} L${g.cx - g.rx * 0.6} ${g.cy - g.ry * 0.95} Z`,
        g.v === 'grandma' || g.v === 'grandpa' ? '#A79A92' : c.quill,
        6,
      ) + ellipse(g.cx, g.noseY + g.ry * 0.08, g.rx * 0.3, g.ry * 0.22, c.light),
    nose: (g, c) => nose(g, c.dark, 0.95, 0.95),
    mouth: 'muzzle',
  },
  {
    key: 'otter',
    en: 'Otter',
    fr: 'Loutre',
    colors: {
      fur: '#8E6247',
      shade: '#76503A',
      light: '#EBCDA8',
      dark: '#2B1E19',
      inner: '#6A4533',
      hair: '#4F3426',
    },
    style: {
      teen: 'cap',
      mom: { head: 'flower', earrings: 'pearl' },
      dad: { hair: 'walrus', outfit: 'polo' },
      grandpa: { hair: 'beard', glasses: 'rect' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          roundEar(g, s, { angle: 66, r: g.rx * 0.17, fill: c.fur, inner: c.inner, k: 0.98 }),
        )
        .join(''),
    head: (g, c) => blob(g.cx, g.cy + 2, g.rx * 1.04, g.ry * 0.94, c.fur, c.shade),
    face: (g, c) =>
      ellipse(g.cx, g.cy + g.ry * 0.42, g.rx * 0.78, g.ry * 0.46, c.light) +
      ellipse(g.cx - g.eyeDx, g.eyeY + 2, g.eyeRx * 1.9, g.eyeRy * 1.6, c.light, {
        opacity: 0.55,
      }) +
      ellipse(g.cx + g.eyeDx, g.eyeY + 2, g.eyeRx * 1.9, g.eyeRy * 1.6, c.light, { opacity: 0.55 }),
    nose: (g, c) => nose(g, c.dark, 1.2, 0.95),
    mouth: 'muzzle',
    whiskers: true,
  },
  {
    key: 'raccoon',
    en: 'Raccoon',
    fr: 'Raton laveur',
    colors: {
      fur: '#9B98A8',
      shade: '#82808F',
      light: '#F6F4FA',
      dark: '#33303D',
      inner: '#4A4656',
      hair: '#4A4656',
    },
    eyes: 'patch',
    style: {
      teen: 'beanie',
      mom: { head: 'headband', earrings: 'hoop' },
      dad: { hair: 'chevron', outfit: 'bowtie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          pointEar(g, s, {
            angle: 44,
            len: g.ry * 0.5,
            width: g.rx * 0.3,
            fill: c.light,
            inner: c.inner,
            round: 16,
          }),
        )
        .join(''),
    face: (g, c) => {
      const y = g.eyeY + 2;
      // white brows + bandit mask + muzzle
      let s = ellipse(g.cx, g.cy - g.ry * 0.12, g.rx * 0.82, g.ry * 0.3, c.light);
      s += soft(
        d`M${g.cx - g.rx * 0.98} ${y - 4} Q${g.cx - g.eyeDx} ${y - g.eyeRy * 2} ${g.cx - 6} ${y - 6}
          Q${g.cx} ${y - 2} ${g.cx + 6} ${y - 6} Q${g.cx + g.eyeDx} ${y - g.eyeRy * 2} ${g.cx + g.rx * 0.98} ${y - 4}
          Q${g.cx + g.eyeDx * 1.3} ${y + g.eyeRy * 2.1} ${g.cx + 6} ${y + 8} Q${g.cx} ${y + 12} ${g.cx - 6} ${y + 8}
          Q${g.cx - g.eyeDx * 1.3} ${y + g.eyeRy * 2.1} ${g.cx - g.rx * 0.98} ${y - 4} Z`,
        c.dark,
        4,
      );
      s += soft(
        d`M${g.cx - 5} ${g.cy - g.ry * 0.9} L${g.cx + 5} ${g.cy - g.ry * 0.9} L${g.cx + 3} ${y - 4} L${g.cx - 3} ${y - 4} Z`,
        c.shade,
        4,
      );
      s += ellipse(g.cx, g.noseY + g.ry * 0.12, g.rx * 0.36, g.ry * 0.26, c.light);
      return s;
    },
    nose: (g, c) => nose(g, c.dark, 1.05),
    mouth: 'muzzle',
    whiskers: true,
  },
  {
    key: 'monkey',
    en: 'Monkey',
    fr: 'Singe',
    colors: {
      fur: '#7E5139',
      shade: '#683F2C',
      light: '#F3CDA6',
      dark: '#3A2219',
      inner: '#E8B48B',
      hair: '#4A2C1F',
    },
    style: {
      teen: 'headphones',
      mom: { head: 'bow', earrings: 'hoop' },
      dad: { hair: 'beard', outfit: 'tie' },
      grandpa: { hair: 'moustache', glasses: 'round' },
    },
    back: (g, c) =>
      [-1, 1]
        .map((s) =>
          roundEar(g, s, {
            angle: 84,
            r: g.rx * 0.27,
            fill: c.fur,
            inner: c.inner,
            k: 0.98,
            innerK: 0.6,
          }),
        )
        .join(''),
    face: (g, c) =>
      // heart-shaped face mask
      circle(g.cx - g.eyeDx * 0.92, g.eyeY - 2, g.rx * 0.37, c.light) +
      circle(g.cx + g.eyeDx * 0.92, g.eyeY - 2, g.rx * 0.37, c.light) +
      ellipse(g.cx, g.cy + g.ry * 0.42, g.rx * 0.64, g.ry * 0.46, c.light),
    top: (g, c) =>
      g.v === 'grandma'
        ? ''
        : soft(
            d`M${g.cx - 12} ${g.cy - g.ry * 0.92} Q${g.cx - 8} ${g.cy - g.ry * 1.22} ${g.cx + 4} ${g.cy - g.ry * 1.18} Q${g.cx - 2} ${g.cy - g.ry * 1.05} ${g.cx + 10} ${g.cy - g.ry * 0.94} Z`,
            c.fur,
            6,
          ),
    nose: (g, c) =>
      ellipse(g.cx - 4.5, g.noseY - 2, 2.6, 3.4, c.dark, { opacity: 0.8 }) +
      ellipse(g.cx + 4.5, g.noseY - 2, 2.6, 3.4, c.dark, { opacity: 0.8 }),
    mouth: 'wide',
    mouthW: 0.36,
    mouthDy: 0.02,
  },
];

export { INK, defaultBody, whiskers, group };
