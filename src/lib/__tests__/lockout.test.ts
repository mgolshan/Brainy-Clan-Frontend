import { formatRetryIn, parseRetryAfter, secondsLeft } from '@/lib/lockout';

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');

  it('prefers the body retry_after (seconds)', () => {
    expect(parseRetryAfter(300, '60', now)).toBe(300);
    expect(parseRetryAfter(12.2, null, now)).toBe(13);
    expect(parseRetryAfter('90', null, now)).toBe(90);
  });

  it('falls back to the Retry-After header in seconds', () => {
    expect(parseRetryAfter(undefined, '3600', now)).toBe(3600);
    expect(parseRetryAfter(null, ' 120 ', now)).toBe(120);
  });

  it('reads an HTTP-date Retry-After relative to now, never negative', () => {
    expect(parseRetryAfter(undefined, 'Thu, 22 Oct 2026 12:05:00 GMT', now)).toBe(300);
    expect(parseRetryAfter(undefined, 'Thu, 22 Oct 2026 11:00:00 GMT', now)).toBe(0);
  });

  it('returns null when nothing usable is given', () => {
    expect(parseRetryAfter(undefined, null, now)).toBeNull();
    expect(parseRetryAfter(-5, '', now)).toBeNull();
    expect(parseRetryAfter('soon', 'later', now)).toBeNull();
    expect(parseRetryAfter(Number.NaN, undefined, now)).toBeNull();
  });
});

describe('formatRetryIn', () => {
  it('shows a m:ss clock under 15 minutes', () => {
    expect(formatRetryIn(300)).toEqual({ unit: 'clock', time: '5:00' });
    expect(formatRetryIn(299)).toEqual({ unit: 'clock', time: '4:59' });
    expect(formatRetryIn(59)).toEqual({ unit: 'clock', time: '0:59' });
    expect(formatRetryIn(0)).toEqual({ unit: 'clock', time: '0:00' });
    expect(formatRetryIn(-3)).toEqual({ unit: 'clock', time: '0:00' });
    expect(formatRetryIn(899)).toEqual({ unit: 'clock', time: '14:59' });
  });

  it('shows whole minutes (rounded up) for the 15 min and 1 h locks', () => {
    expect(formatRetryIn(900)).toEqual({ unit: 'minutes', count: 15 });
    expect(formatRetryIn(3600)).toEqual({ unit: 'minutes', count: 60 });
    expect(formatRetryIn(3541)).toEqual({ unit: 'minutes', count: 60 });
    expect(formatRetryIn(1801)).toEqual({ unit: 'minutes', count: 31 });
  });

  it('shows whole hours (rounded up) for the 24 h lock', () => {
    expect(formatRetryIn(86_400)).toEqual({ unit: 'hours', count: 24 });
    expect(formatRetryIn(86_399)).toEqual({ unit: 'hours', count: 24 });
    expect(formatRetryIn(7200)).toEqual({ unit: 'hours', count: 2 });
    expect(formatRetryIn(3600 * 23 + 1)).toEqual({ unit: 'hours', count: 24 });
  });
});

describe('secondsLeft', () => {
  const at = 1_000_000;

  it('counts down from retry_after', () => {
    expect(secondsLeft(at, 300, at)).toBe(300);
    expect(secondsLeft(at, 300, at + 1000)).toBe(299);
    expect(secondsLeft(at, 300, at + 299_500)).toBe(1);
    expect(secondsLeft(at, 300, at + 300_000)).toBe(0);
    expect(secondsLeft(at, 300, at + 999_000)).toBe(0);
  });

  it('never adds time for a stale clock from before the answer', () => {
    expect(secondsLeft(at, 300, at - 600_000)).toBe(300);
  });
});
