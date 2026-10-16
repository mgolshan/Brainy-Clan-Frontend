/**
 * Compare two dotted version strings ("1.2.0" vs "1.10"). Missing parts count as 0 and
 * non-numeric suffixes ("1.0.0-beta") are ignored.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  // Drop "-beta.2" / "+build.5" first, so their dotted parts don't count as version numbers.
  const parts = (v: string) =>
    v
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => parseInt(part, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** True when `current` is older than `minimum`. */
export function isVersionOlder(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}
