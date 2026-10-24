import type { SpotChange, SpotColor, SpotDifferencePayload, SpotObject } from '@/api/types';

/**
 * Pure spot-the-difference helpers, mirroring the contract (docs/API.md "Brain games"):
 * object `x` / `y` / `size` are fractions of the picture **width**; a tap is normalized 0–1 per
 * axis within the tapped picture (x by its width, y by its height), so its y in width units is
 * `ty / aspect`. A tap finds a change when it falls within the changed object's circle (radius
 * `size × 0.75`, at least 0.06) on either picture; each change counts once. The server decides.
 */

export const SPOT_COLORS: readonly SpotColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'brown',
  'white',
];

export const SPOT_PROPS = [
  'tree',
  'sun',
  'cloud',
  'flower',
  'house',
  'ball',
  'star',
  'kite',
  'boat',
  'fish',
  'bird',
  'rock',
] as const;
export type SpotProp = (typeof SPOT_PROPS)[number];

/** The server accepts at most this many taps (422 beyond). */
export const MAX_TAPS = 60;
export const MIN_HIT_RADIUS = 0.06;
export const HIT_RADIUS_FACTOR = 0.75;

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function isSpotColor(value: unknown): value is SpotColor {
  return typeof value === 'string' && (SPOT_COLORS as readonly string[]).includes(value);
}

function isObject(o: unknown): o is SpotObject {
  const v = o as SpotObject | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.id === 'string' &&
    v.id !== '' &&
    typeof v.kind === 'string' &&
    v.kind !== '' &&
    finite(v.x) &&
    finite(v.y) &&
    finite(v.size) &&
    v.x >= 0 &&
    v.x <= 1 &&
    v.y >= 0 &&
    v.y <= 1.5 &&
    v.size > 0 &&
    v.size <= 1 &&
    isSpotColor(v.color) &&
    typeof v.flip === 'boolean'
  );
}

function isChange(c: unknown, objectIds: ReadonlySet<string>): c is SpotChange {
  const v = c as SpotChange | null;
  if (typeof v !== 'object' || v === null) return false;
  if (typeof v.id !== 'string' || v.id === '' || !objectIds.has(v.object_id)) return false;
  switch (v.change) {
    case 'missing':
      return true;
    case 'color':
      return isSpotColor(v.value);
    case 'size':
      return finite(v.value) && v.value > 0 && v.value <= 1;
    case 'flip':
      return v.value === null || typeof v.value === 'boolean';
    default:
      return false;
  }
}

export function isSpotDifferencePayload(value: unknown): value is SpotDifferencePayload {
  const v = value as SpotDifferencePayload | null;
  if (typeof v !== 'object' || v === null) return false;
  if (!finite(v.aspect) || v.aspect < 0.25 || v.aspect > 4) return false;
  if (!Number.isInteger(v.max_misses) || v.max_misses < 0) return false;
  if (!Array.isArray(v.objects) || v.objects.length === 0 || v.objects.length > 80) return false;
  if (!v.objects.every(isObject)) return false;
  const ids = new Set(v.objects.map((o) => o.id));
  if (ids.size !== v.objects.length) return false;
  if (!Array.isArray(v.changes) || v.changes.length === 0) return false;
  if (!v.changes.every((c) => isChange(c, ids))) return false;
  return new Set(v.changes.map((c) => c.id)).size === v.changes.length;
}

/** The right picture: the objects with `changes` applied (missing objects removed). */
export function applyChanges(
  objects: readonly SpotObject[],
  changes: readonly SpotChange[],
): SpotObject[] {
  const byObject = new Map<string, SpotChange[]>();
  for (const c of changes) byObject.set(c.object_id, [...(byObject.get(c.object_id) ?? []), c]);
  const out: SpotObject[] = [];
  for (const o of objects) {
    let next: SpotObject | null = o;
    for (const c of byObject.get(o.id) ?? []) {
      if (!next) break;
      if (c.change === 'missing') next = null;
      else if (c.change === 'color' && isSpotColor(c.value)) next = { ...next, color: c.value };
      else if (c.change === 'size' && finite(c.value)) next = { ...next, size: c.value };
      else if (c.change === 'flip') next = { ...next, flip: !next.flip };
    }
    if (next) out.push(next);
  }
  return out;
}

/** Hit circle of a change: centre and radius in picture-width units. */
export function changeCircle(
  change: SpotChange,
  objects: readonly SpotObject[],
): { x: number; y: number; r: number } | null {
  const o = objects.find((obj) => obj.id === change.object_id);
  if (!o) return null;
  const changedSize =
    change.change === 'size' && typeof change.value === 'number' ? change.value : 0;
  const size = Math.max(o.size, changedSize);
  return { x: o.x, y: o.y, r: Math.max(size * HIT_RADIUS_FACTOR, MIN_HIT_RADIUS) };
}

/**
 * The change a tap hits (the nearest one whose circle contains it), or null for a miss. The
 * circle uses the larger of the original and the changed size for a `size` change (contract).
 */
export function hitTest(
  tap: readonly [number, number],
  payload: SpotDifferencePayload,
): string | null {
  const x = tap[0];
  const y = tap[1] / payload.aspect;
  let best: { id: string; d: number } | null = null;
  for (const change of payload.changes) {
    const circle = changeCircle(change, payload.objects);
    if (!circle) continue;
    const d = Math.hypot(x - circle.x, y - circle.y);
    if (d <= circle.r + 1e-9 && (!best || d < best.d)) best = { id: change.id, d };
  }
  return best?.id ?? null;
}

/** Taps → found change ids (each once, in order) and misses, like the server counts them. */
export function scoreTaps(
  taps: readonly (readonly [number, number])[],
  payload: SpotDifferencePayload,
): { found: string[]; misses: number } {
  const found: string[] = [];
  let misses = 0;
  for (const tap of taps) {
    if (found.length === payload.changes.length) break;
    const id = hitTest(tap, payload);
    if (id === null) misses++;
    else if (!found.includes(id)) found.push(id);
  }
  return { found, misses };
}

/** A point within a picture of `width × height` (layout units) → normalized [x, y], clamped. */
export function normalizeTap(
  px: number,
  py: number,
  width: number,
  height: number,
): [number, number] {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return [round(clamp(px / (width || 1))), round(clamp(py / (height || 1)))];
}

/** The normalized tap at an object's centre (the screen-reader list "Is this different?"). */
export function objectCenterTap(object: SpotObject, aspect: number): [number, number] {
  return [Math.min(1, Math.max(0, object.x)), Math.min(1, Math.max(0, object.y * aspect))];
}

/** Which picture a point in a side-by-side or stacked pair falls in, and the point inside it. */
export function locateInPair(
  px: number,
  py: number,
  picture: { width: number; height: number },
  gap: number,
  stacked: boolean,
): { side: 0 | 1; x: number; y: number } | null {
  const along = stacked ? py : px;
  const extent = stacked ? picture.height : picture.width;
  let side: 0 | 1;
  let offset: number;
  if (along >= 0 && along <= extent) {
    side = 0;
    offset = 0;
  } else if (along >= extent + gap && along <= extent * 2 + gap) {
    side = 1;
    offset = extent + gap;
  } else return null;
  return stacked ? { side, x: px, y: py - offset } : { side, x: px - offset, y: py };
}

/** A previously recorded `{ taps }` (pending or submitted response); else []. */
export function readTaps(value: unknown): [number, number][] {
  const taps =
    typeof value === 'object' && value !== null && 'taps' in value
      ? (value as { taps: unknown }).taps
      : null;
  if (!Array.isArray(taps)) return [];
  return taps.filter(
    (t): t is [number, number] =>
      Array.isArray(t) && t.length === 2 && finite(t[0]) && finite(t[1]),
  );
}

/** `correct_response.changes` (the ids of every change); else []. */
export function readChangeIds(value: unknown): string[] {
  const ids =
    typeof value === 'object' && value !== null && 'changes' in value
      ? (value as { changes: unknown }).changes
      : null;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

export function isSpotProp(kind: string): kind is SpotProp {
  return (SPOT_PROPS as readonly string[]).includes(kind);
}
