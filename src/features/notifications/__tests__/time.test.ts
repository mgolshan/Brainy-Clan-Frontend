import { defaultQuietHours, formatTime, pad2, parseTime } from '@/features/notifications/time';

describe('parseTime', () => {
  it.each([
    ['07:30', { hour: 7, minute: 30 }],
    ['7:05', { hour: 7, minute: 5 }],
    ['00:00', { hour: 0, minute: 0 }],
    ['23:59', { hour: 23, minute: 59 }],
    ['21:30:00', { hour: 21, minute: 30 }], // server may send seconds
  ])('parses %p', (value, expected) => {
    expect(parseTime(value)).toEqual(expected);
  });

  it.each([null, undefined, '', '24:00', '12:60', '7', 'ab:cd', '7:5', ' 07:30'])(
    'rejects %p',
    (value) => {
      expect(parseTime(value)).toBeNull();
    },
  );
});

describe('formatTime / pad2', () => {
  it('formats 24 h HH:MM with leading zeros', () => {
    expect(formatTime({ hour: 7, minute: 5 })).toBe('07:05');
    expect(formatTime({ hour: 21, minute: 30 })).toBe('21:30');
    expect(formatTime({ hour: 0, minute: 0 })).toBe('00:00');
    expect(pad2(9)).toBe('09');
    expect(pad2(45)).toBe('45');
  });

  it('round-trips through parseTime (quiet hours defaults and every 15-minute stepper value)', () => {
    for (const value of ['19:30', '07:30', '21:30', '07:00']) {
      expect(formatTime(parseTime(value)!)).toBe(value);
    }
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const text = formatTime({ hour, minute });
        expect(text).toMatch(/^\d{2}:\d{2}$/);
        expect(parseTime(text)).toEqual({ hour, minute });
      }
    }
  });

  it('a stepper change keeps the other part (hour change keeps minutes)', () => {
    const current = parseTime('21:45')!;
    expect(formatTime({ ...current, hour: 22 })).toBe('22:45');
    expect(formatTime({ ...current, minute: 0 })).toBe('21:00');
  });
});

describe('defaultQuietHours (API.md defaults)', () => {
  it('is 19:30–07:30 for children', () => {
    expect(defaultQuietHours('child')).toEqual({ quiet_from: '19:30', quiet_to: '07:30' });
  });

  it.each(['teen', 'adult', 'senior', undefined])('is 21:30–07:00 for %p', (band) => {
    expect(defaultQuietHours(band)).toEqual({ quiet_from: '21:30', quiet_to: '07:00' });
  });
});
