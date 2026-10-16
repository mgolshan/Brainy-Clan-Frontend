import { compareVersions, isVersionOlder } from '@/lib/version';

describe('compareVersions', () => {
  it.each<[string, string, -1 | 0 | 1]>([
    ['1.0.0', '1.0.0', 0],
    ['1.0', '1.0.0', 0],
    ['1', '1.0.0', 0],
    ['1.2.0', '1.10.0', -1], // numeric, not string comparison
    ['1.10.0', '1.9.9', 1],
    ['2.0.0', '1.99.99', 1],
    ['1.0.1', '1.0', 1],
    ['0.9', '1.0', -1],
    ['1.0.0-beta', '1.0.0', 0], // pre-release suffix ignored
    ['1.2.3-rc.1', '1.2.3', 0], // the suffix's dotted parts are not version numbers
    ['1.2.3+build.7', '1.2.3', 0],
    ['1.2.4-beta.1', '1.2.3', 1],
  ])('compareVersions(%p, %p) = %p', (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });

  it('treats garbage parts as 0', () => {
    expect(compareVersions('x.y.z', '0.0.0')).toBe(0);
    expect(compareVersions('', '0')).toBe(0);
  });
});

describe('isVersionOlder', () => {
  it('is true only when current < minimum', () => {
    expect(isVersionOlder('1.0.0', '1.1.0')).toBe(true);
    expect(isVersionOlder('1.1.0', '1.1.0')).toBe(false);
    expect(isVersionOlder('1.2.0', '1.1.9')).toBe(false);
  });
});
