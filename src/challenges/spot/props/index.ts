import type { SpotColor } from '@/api/types';
import type { SpotProp } from '@/challenges/spot/logic';

/**
 * Spot-the-difference prop art (original, flat, in the style of the Clan characters: soft
 * shapes, a darker "shadow side" under each fill, round joins). Every prop is drawn in a
 * 100×100 viewBox centred on the object and is deliberately asymmetric so a `flip` change shows.
 * The named art colors map to a fixed palette here: this module is picture art, like the
 * generated avatars, not UI chrome (UI colors still come from the theme).
 */

/** Fixed art palette for the contract's named colors: [fill, shadow]. */
export const SPOT_PALETTE: Readonly<Record<SpotColor, readonly [string, string]>> = {
  red: ['#E8574F', '#B93C36'],
  orange: ['#F5993D', '#C9732A'],
  yellow: ['#F7CE3E', '#C9A22B'],
  green: ['#5DB95C', '#3E8C45'],
  blue: ['#4A8FE0', '#3168AE'],
  purple: ['#9C6BD4', '#7449A6'],
  pink: ['#F28CB6', '#C8648C'],
  brown: ['#A06D46', '#764C2F'],
  white: ['#FAF7F0', '#CFC6B6'],
};

const INK = '#3B2A2A';
const TRUNK = ['#93613D', '#6C4329'] as const;
const LEAF = ['#5DB95C', '#3E8C45'] as const;
const GLOW = 'rgba(255,255,255,0.45)';

type Draw = (fill: string, shade: string) => string;

const svg = (body: string) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${body}</svg>`;

const ART: Record<SpotProp, Draw> = {
  // Canopy heavier on the right, a branch to the left.
  tree: (f, s) =>
    `<path d='M45 94 L49 56 L57 56 L60 94 Z' fill='${TRUNK[0]}' stroke='${TRUNK[1]}' stroke-width='3' stroke-linejoin='round'/>` +
    `<path d='M51 72 L34 60' stroke='${TRUNK[1]}' stroke-width='6' stroke-linecap='round'/>` +
    `<circle cx='32' cy='57' r='9' fill='${s}'/><circle cx='31' cy='55' r='8' fill='${f}'/>` +
    `<circle cx='42' cy='42' r='21' fill='${s}'/><circle cx='64' cy='36' r='25' fill='${s}'/><circle cx='68' cy='58' r='19' fill='${s}'/>` +
    `<circle cx='40' cy='40' r='20' fill='${f}'/><circle cx='62' cy='34' r='24' fill='${f}'/><circle cx='66' cy='55' r='18' fill='${f}'/>` +
    `<ellipse cx='54' cy='24' rx='9' ry='5' fill='${GLOW}' transform='rotate(-20 54 24)'/>`,
  // Rays all round, a face glancing to the right with a lopsided smile.
  sun: (f, s) =>
    Array.from({ length: 8 }, (_, i) => {
      const len = i === 1 ? 46 : 40;
      return `<path d='M47 ${50 - len} L53 ${50 - len} L50 ${50 - len - 10} Z' fill='${f}' stroke='${s}' stroke-width='4' stroke-linejoin='round' transform='rotate(${i * 45} 50 50)'/>`;
    }).join('') +
    `<circle cx='51' cy='52' r='27' fill='${s}'/><circle cx='50' cy='50' r='26' fill='${f}'/>` +
    `<circle cx='50' cy='46' r='3.4' fill='${INK}'/><circle cx='62' cy='46' r='3.4' fill='${INK}'/>` +
    `<path d='M47 58 Q57 66 66 55' fill='none' stroke='${INK}' stroke-width='3.5' stroke-linecap='round'/>` +
    `<circle cx='40' cy='56' r='4' fill='rgba(242,120,120,0.45)'/>`,
  // Big lump on the right, small puff on the left.
  cloud: (f, s) =>
    `<path d='M14 70 Q8 56 22 52 Q24 38 38 42 Q46 22 66 28 Q84 30 84 48 Q96 52 92 66 Q90 74 80 74 L22 74 Q16 74 14 70 Z' fill='${s}'/>` +
    `<path d='M14 66 Q8 54 22 50 Q24 36 38 40 Q46 20 66 26 Q84 28 84 46 Q96 50 92 62 Q90 70 80 70 L22 70 Q16 70 14 66 Z' fill='${f}' stroke='${s}' stroke-width='2.5' stroke-linejoin='round'/>` +
    `<ellipse cx='60' cy='36' rx='10' ry='5' fill='${GLOW}' transform='rotate(-12 60 36)'/>`,
  // Petals up top, stem curving right, one leaf on the left.
  flower: (f, s) =>
    `<path d='M50 50 Q52 72 62 94' fill='none' stroke='${LEAF[1]}' stroke-width='6' stroke-linecap='round'/>` +
    `<path d='M53 74 Q36 62 28 72 Q38 82 53 74 Z' fill='${LEAF[0]}' stroke='${LEAF[1]}' stroke-width='2.5' stroke-linejoin='round'/>` +
    Array.from(
      { length: 5 },
      (_, i) =>
        `<ellipse cx='50' cy='22' rx='11' ry='15' fill='${f}' stroke='${s}' stroke-width='3' transform='rotate(${i * 72 + 10} 50 38)'/>`,
    ).join('') +
    `<circle cx='50' cy='38' r='10' fill='${INK}'/><circle cx='47' cy='35' r='3.5' fill='${GLOW}'/>`,
  // Door on the left, window on the right, chimney on the right slope.
  house: (f, s) =>
    `<rect x='64' y='14' width='10' height='22' rx='2' fill='${TRUNK[0]}' stroke='${TRUNK[1]}' stroke-width='3'/>` +
    `<rect x='20' y='46' width='62' height='46' rx='3' fill='${s}'/>` +
    `<rect x='18' y='44' width='62' height='46' rx='3' fill='${f}' stroke='${s}' stroke-width='3'/>` +
    `<path d='M10 48 L49 14 L88 48 Z' fill='${TRUNK[0]}' stroke='${TRUNK[1]}' stroke-width='4' stroke-linejoin='round'/>` +
    `<rect x='27' y='60' width='16' height='30' rx='3' fill='${INK}'/><circle cx='39' cy='76' r='1.8' fill='#F7CE3E'/>` +
    `<rect x='54' y='58' width='18' height='16' rx='2' fill='#BFE3F7' stroke='${INK}' stroke-width='3'/>` +
    `<path d='M63 58 V74 M54 66 H72' stroke='${INK}' stroke-width='2.5'/>`,
  // A curved stripe and a highlight up-left.
  ball: (f, s) =>
    `<circle cx='52' cy='54' r='34' fill='${s}'/><circle cx='50' cy='52' r='34' fill='${f}'/>` +
    `<path d='M22 34 Q54 46 64 86' fill='none' stroke='#FAF7F0' stroke-width='9' stroke-linecap='round'/>` +
    `<path d='M42 18 Q62 34 84 40' fill='none' stroke='${s}' stroke-width='5' stroke-linecap='round'/>` +
    `<ellipse cx='34' cy='32' rx='8' ry='5' fill='${GLOW}' transform='rotate(-35 34 32)'/>`,
  // A tilted star with a sparkle at its top right.
  star: (f, s) =>
    `<g transform='rotate(14 50 54)'>` +
    `<path d='M50 12 L61 38 L89 40 L67 58 L74 86 L50 71 L26 86 L33 58 L11 40 L39 38 Z' fill='${s}' transform='translate(2 2)'/>` +
    `<path d='M50 12 L61 38 L89 40 L67 58 L74 86 L50 71 L26 86 L33 58 L11 40 L39 38 Z' fill='${f}' stroke='${s}' stroke-width='3' stroke-linejoin='round'/>` +
    `</g>` +
    `<path d='M84 10 L86 16 L92 18 L86 20 L84 26 L82 20 L76 18 L82 16 Z' fill='${f}' stroke='${s}' stroke-width='1.5'/>`,
  // Diamond up-right, tail drifting down to the left with two bows.
  kite: (f, s) =>
    `<path d='M50 64 Q40 76 46 84 Q52 92 30 96' fill='none' stroke='${INK}' stroke-width='2.5' stroke-linecap='round'/>` +
    `<path d='M40 76 L48 72 L46 80 Z M34 90 L42 88 L38 95 Z' fill='#E8574F'/>` +
    `<path d='M58 6 L84 34 L50 64 L30 30 Z' fill='${f}' stroke='${s}' stroke-width='3' stroke-linejoin='round'/>` +
    `<path d='M58 6 L84 34 L57 35 Z M30 30 L57 35 L50 64 Z' fill='${s}'/>` +
    `<path d='M58 6 L50 64 M30 30 L84 34' stroke='${INK}' stroke-width='2'/>`,
  // Sail on the right of the mast, flag pointing right.
  boat: (f, s) =>
    `<path d='M44 12 V66' stroke='${TRUNK[1]}' stroke-width='4' stroke-linecap='round'/>` +
    `<path d='M44 12 L58 16 L44 21 Z' fill='#E8574F'/>` +
    `<path d='M48 24 L80 62 L48 62 Z' fill='#FAF7F0' stroke='#CFC6B6' stroke-width='3' stroke-linejoin='round'/>` +
    `<path d='M40 32 L40 62 L22 62 Z' fill='#FAF7F0' stroke='#CFC6B6' stroke-width='3' stroke-linejoin='round'/>` +
    `<path d='M10 68 H90 L78 88 H24 Z' fill='${s}'/>` +
    `<path d='M10 66 H90 L78 84 H24 Z' fill='${f}' stroke='${s}' stroke-width='3' stroke-linejoin='round'/>` +
    `<circle cx='34' cy='74' r='3' fill='${INK}'/><circle cx='50' cy='74' r='3' fill='${INK}'/><circle cx='66' cy='74' r='3' fill='${INK}'/>`,
  // Swimming right: tail on the left, eye on the right.
  fish: (f, s) =>
    `<path d='M28 52 L8 34 L10 72 Z' fill='${s}' stroke='${s}' stroke-width='4' stroke-linejoin='round'/>` +
    `<ellipse cx='54' cy='54' rx='34' ry='24' fill='${s}'/>` +
    `<ellipse cx='52' cy='52' rx='34' ry='24' fill='${f}'/>` +
    `<path d='M46 30 Q56 18 66 30 Z' fill='${s}'/>` +
    `<path d='M42 44 Q48 52 42 60 M52 42 Q58 52 52 62' fill='none' stroke='${s}' stroke-width='3' stroke-linecap='round'/>` +
    `<circle cx='72' cy='46' r='6' fill='#FAF7F0'/><circle cx='74' cy='46' r='3.2' fill='${INK}'/>` +
    `<path d='M80 60 Q84 62 86 58' fill='none' stroke='${INK}' stroke-width='2.5' stroke-linecap='round'/>`,
  // Facing right: beak right, tail feathers left.
  bird: (f, s) =>
    `<path d='M26 58 L6 50 L10 64 L4 72 L28 66 Z' fill='${s}' stroke='${s}' stroke-width='3' stroke-linejoin='round'/>` +
    `<ellipse cx='48' cy='60' rx='26' ry='20' fill='${s}'/><ellipse cx='46' cy='58' rx='26' ry='20' fill='${f}'/>` +
    `<circle cx='68' cy='40' r='16' fill='${s}'/><circle cx='66' cy='38' r='16' fill='${f}'/>` +
    `<path d='M80 36 L96 42 L80 46 Z' fill='#F5993D' stroke='#C9732A' stroke-width='2' stroke-linejoin='round'/>` +
    `<circle cx='70' cy='35' r='3.4' fill='${INK}'/>` +
    `<path d='M30 54 Q44 46 56 60 Q42 70 30 54 Z' fill='${s}'/>` +
    `<path d='M42 78 V90 M54 78 V90' stroke='#C9732A' stroke-width='3' stroke-linecap='round'/>`,
  // A lumpy rock, peak to the left.
  rock: (f, s) =>
    `<path d='M8 84 L18 50 L34 30 L50 40 L66 36 L86 56 L94 84 Z' fill='${s}' stroke='${s}' stroke-width='4' stroke-linejoin='round'/>` +
    `<path d='M8 80 L18 48 L34 28 L50 38 L66 34 L86 54 L92 80 Z' fill='${f}' stroke='${s}' stroke-width='3' stroke-linejoin='round'/>` +
    `<path d='M34 28 L40 56 L66 34 M40 56 L60 80' fill='none' stroke='${s}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/>` +
    `<path d='M24 50 L32 38' stroke='${GLOW}' stroke-width='5' stroke-linecap='round'/>`,
};

const cache = new Map<string, string>();

/** SVG markup of a prop in a named color (cached per kind + color). */
export function propSvg(kind: SpotProp, color: SpotColor): string {
  const key = `${kind}:${color}`;
  let xml = cache.get(key);
  if (!xml) {
    const [fill, shade] = SPOT_PALETTE[color];
    xml = svg(ART[kind](fill, shade));
    cache.set(key, xml);
  }
  return xml;
}

/** Fill color of a named art color (avatar discs, unknown kinds). */
export function spotFill(color: SpotColor): string {
  return SPOT_PALETTE[color][0];
}

export function spotShade(color: SpotColor): string {
  return SPOT_PALETTE[color][1];
}
