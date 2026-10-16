import type { TFunction } from 'i18next';

import {
  dateInTimeZone,
  formatPeriodRange,
  formatTimeLeft,
  startDateOptions,
  toDateString,
} from '@/features/goals/time';

const TORONTO = 'America/Toronto';

// The device zone is pinned to America/Toronto for all tests (jest.globalSetup.js).
it('runs with the device in Toronto', () => {
  expect(new Date('2026-10-17T03:30:00Z').getDate()).toBe(16);
});

describe('dateInTimeZone', () => {
  // Friday 2026-10-16, 23:30 in Toronto (EDT, UTC-4) = Saturday 03:30 UTC.
  const lateEveningToronto = new Date('2026-10-16T23:30:00-04:00');

  it("gives the family's calendar date late in the evening, not the UTC date", () => {
    expect(lateEveningToronto.toISOString()).toBe('2026-10-17T03:30:00.000Z');
    expect(dateInTimeZone(lateEveningToronto, TORONTO)).toBe('2026-10-16');
    expect(dateInTimeZone(lateEveningToronto, 'UTC')).toBe('2026-10-17');
    expect(dateInTimeZone(lateEveningToronto, 'Asia/Tokyo')).toBe('2026-10-17');
  });

  it('uses the family zone, not the device zone (device in Toronto, family in Tokyo)', () => {
    const tokyoMorning = new Date('2026-10-17T08:00:00+09:00'); // Fri 19:00 in Toronto
    expect(toDateString(tokyoMorning)).toBe('2026-10-16');
    expect(dateInTimeZone(tokyoMorning, 'Asia/Tokyo')).toBe('2026-10-17');
  });

  it('falls back to the device date for an unknown or missing zone', () => {
    expect(dateInTimeZone(lateEveningToronto, 'Mars/Olympus_Mons')).toBe('2026-10-16');
    expect(dateInTimeZone(lateEveningToronto)).toBe('2026-10-16');
    expect(dateInTimeZone(lateEveningToronto, '')).toBe('2026-10-16');
  });

  it('toDateString pads month and day', () => {
    expect(toDateString(new Date('2026-01-05T12:00:00-05:00'))).toBe('2026-01-05');
  });
});

describe('startDateOptions (wizard start dates in the family zone)', () => {
  it('late Friday evening in Toronto: today is still Friday', () => {
    const now = new Date('2026-10-16T23:30:00-04:00');
    expect(startDateOptions(now, TORONTO)).toEqual({
      today: '2026-10-16',
      tomorrow: '2026-10-17',
      nextMonday: '2026-10-19',
    });
  });

  it('the same instant in Tokyo is already Saturday', () => {
    const now = new Date('2026-10-16T23:30:00-04:00');
    expect(startDateOptions(now, 'Asia/Tokyo')).toEqual({
      today: '2026-10-17',
      tomorrow: '2026-10-18',
      nextMonday: '2026-10-19',
    });
  });

  it('on a Monday, "next Monday" is a week later', () => {
    expect(startDateOptions(new Date('2026-10-19T09:00:00-04:00'), TORONTO)).toEqual({
      today: '2026-10-19',
      tomorrow: '2026-10-20',
      nextMonday: '2026-10-26',
    });
  });

  it('on a Sunday, "next Monday" is tomorrow', () => {
    const options = startDateOptions(new Date('2026-10-18T20:00:00-04:00'), TORONTO);
    expect(options.tomorrow).toBe('2026-10-19');
    expect(options.nextMonday).toBe('2026-10-19');
  });

  it('crosses month and year ends', () => {
    expect(startDateOptions(new Date('2026-12-31T22:00:00-05:00'), TORONTO)).toEqual({
      today: '2026-12-31',
      tomorrow: '2027-01-01',
      nextMonday: '2027-01-04',
    });
  });

  it('is not shifted by the DST change (Toronto falls back on Sun 2026-11-01)', () => {
    expect(startDateOptions(new Date('2026-10-31T23:30:00-04:00'), TORONTO)).toEqual({
      today: '2026-10-31',
      tomorrow: '2026-11-01',
      nextMonday: '2026-11-02',
    });
  });
});

describe('formatPeriodRange (exclusive ends_at)', () => {
  it('a week ends the day before the next period starts', () => {
    expect(
      formatPeriodRange('2026-10-12T00:00:00-04:00', '2026-10-19T00:00:00-04:00', 'en-US'),
    ).toBe('Oct 12, 2026 – Oct 18, 2026');
  });

  it('accepts UTC timestamps from the server', () => {
    expect(formatPeriodRange('2026-10-12T04:00:00Z', '2026-10-19T04:00:00Z', 'en-US')).toBe(
      'Oct 12, 2026 – Oct 18, 2026',
    );
  });

  it('a daily period shows a single date', () => {
    expect(
      formatPeriodRange('2026-10-16T00:00:00-04:00', '2026-10-17T00:00:00-04:00', 'en-US'),
    ).toBe('Oct 16, 2026');
  });

  it('a month across the DST change ends on its last day', () => {
    expect(
      formatPeriodRange('2026-11-01T00:00:00-04:00', '2026-12-01T00:00:00-05:00', 'en-US'),
    ).toBe('Nov 1, 2026 – Nov 30, 2026');
  });

  it("labels by the family's calendar when the device is in another zone", () => {
    // A Tokyo family's week: midnight to midnight in Tokyo (device is in Toronto).
    const startsAt = '2026-10-12T00:00:00+09:00';
    const endsAt = '2026-10-19T00:00:00+09:00';
    expect(formatPeriodRange(startsAt, endsAt, 'en-US', 'Asia/Tokyo')).toBe(
      'Oct 12, 2026 – Oct 18, 2026',
    );
    // Without the family zone the device calendar shifts both days.
    expect(formatPeriodRange(startsAt, endsAt, 'en-US')).toBe('Oct 11, 2026 – Oct 18, 2026');
  });

  it('a UTC family week stays Monday–Sunday on a Toronto device', () => {
    expect(formatPeriodRange('2026-10-12T00:00:00Z', '2026-10-19T00:00:00Z', 'en-US', 'UTC')).toBe(
      'Oct 12, 2026 – Oct 18, 2026',
    );
  });

  it('ignores an unknown family zone (device calendar)', () => {
    expect(
      formatPeriodRange('2026-10-12T04:00:00Z', '2026-10-19T04:00:00Z', 'en-US', 'Nowhere/Land'),
    ).toBe('Oct 12, 2026 – Oct 18, 2026');
  });

  it('formats in the requested locale', () => {
    const label = formatPeriodRange(
      '2026-10-12T00:00:00-04:00',
      '2026-10-19T00:00:00-04:00',
      'fr-CA',
    );
    expect(label).toContain('12');
    expect(label).toContain('18');
    expect(label).toMatch(/oct/);
    expect(label).toContain(' – ');
  });

  it('shows the raw end value instead of crashing on a bad timestamp', () => {
    expect(formatPeriodRange('2026-10-12T00:00:00-04:00', 'soon', 'en-US')).toBe(
      'Oct 12, 2026 – soon',
    );
  });
});

describe('formatTimeLeft', () => {
  /** Fake `t`: "key|option=value,...", so tests see the key and the numbers. */
  const t = ((key: string, options?: Record<string, unknown>) =>
    options
      ? `${key}|${Object.entries(options)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}`
      : key) as unknown as TFunction;

  const now = Date.parse('2026-10-16T12:00:00Z');
  const in_ = (ms: number) => new Date(now + ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;

  it.each([
    ['ended', in_(-MIN), 'goals.left.ended'],
    ['exactly now', in_(0), 'goals.left.ended'],
    ['seconds left', in_(30_000), 'goals.left.soon'],
    ['minutes left', in_(5 * MIN), 'goals.left.minutes|count=5'],
    ['hours + minutes', in_(3 * HOUR + 10 * MIN), 'goals.left.hours|count=3,minutes=10'],
    ['days + hours', in_(2 * 24 * HOUR + 4 * HOUR + 59 * MIN), 'goals.left.days|count=2,hours=4'],
    ['invalid date', 'whenever', 'goals.left.ended'],
  ])('%s', (_label, endsAt, expected) => {
    expect(formatTimeLeft(t, endsAt, now)).toBe(expected);
  });
});
