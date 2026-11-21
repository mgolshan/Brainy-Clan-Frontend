import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import {
  addPastedRows,
  charLength,
  checkRoster,
  isBirthYear,
  NICKNAME_MAX,
  parseRosterText,
  ROSTER_MAX_STUDENTS,
  rosterBody,
  rosterServerErrors,
  seatsLeft,
  type RosterRow,
} from '@/features/classroom/roster';

/** Fake `t`: returns the key and its options, so tests see which string was chosen. */
const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as unknown as TFunction;

const NOW = new Date('2026-11-21T12:00:00Z');
const row = (key: string, nickname: string, birthYear = ''): RosterRow => ({
  key,
  nickname,
  birthYear,
});

describe('parseRosterText', () => {
  it('reads one nickname per line, trimmed, without empty lines', () => {
    expect(parseRosterText('  Ava \n\nNoah\r\nMia\r  \n')).toEqual(['Ava', 'Noah', 'Mia']);
  });

  it('drops list markers and collapses inner spaces', () => {
    expect(parseRosterText('1. Ava\n2) Noah\n- Mia\n* Leo\n• Zoé\nJean   Luc')).toEqual([
      'Ava',
      'Noah',
      'Mia',
      'Leo',
      'Zoé',
      'Jean Luc',
    ]);
  });

  it('keeps a number that is part of the name', () => {
    expect(parseRosterText('Sam2\n2Pac')).toEqual(['Sam2', '2Pac']);
  });

  it('returns nothing for blank text', () => {
    expect(parseRosterText('  \n \n')).toEqual([]);
  });
});

describe('charLength / isBirthYear', () => {
  it('counts code points like the server', () => {
    expect(charLength('Zoé')).toBe(3);
    expect(charLength('🦊')).toBe(1);
  });

  it('accepts plausible 4-digit years only', () => {
    expect(isBirthYear('2016', NOW)).toBe(true);
    expect(isBirthYear('2026', NOW)).toBe(true);
    expect(isBirthYear('2027', NOW)).toBe(false);
    expect(isBirthYear('1926', NOW)).toBe(true);
    expect(isBirthYear('1925', NOW)).toBe(false);
    expect(isBirthYear('201', NOW)).toBe(false);
    expect(isBirthYear('', NOW)).toBe(false);
  });
});

describe('checkRoster', () => {
  const base = { classYear: '2016', existing: ['Teacher Jo'], room: null, now: NOW };

  it('accepts a clean list', () => {
    const result = checkRoster({ ...base, rows: [row('a', 'Ava'), row('b', 'Noah', '2015')] });
    expect(result).toEqual({ rows: {}, list: [], ok: true });
  });

  it('flags empty, too long, duplicate (any case) and taken nicknames', () => {
    const result = checkRoster({
      ...base,
      rows: [
        row('a', '  '),
        row('b', 'x'.repeat(NICKNAME_MAX + 1)),
        row('c', 'Mia'),
        row('d', ' mia '),
        row('e', 'teacher jo'),
      ],
    });
    expect(result.rows).toEqual({
      a: 'empty',
      b: 'tooLong',
      c: 'duplicate',
      d: 'duplicate',
      e: 'taken',
    });
    expect(result.ok).toBe(false);
  });

  it('allows exactly 40 characters, emoji counted once', () => {
    const name = '🦊'.repeat(NICKNAME_MAX);
    expect(checkRoster({ ...base, rows: [row('a', name)] }).ok).toBe(true);
  });

  it('flags a bad per-student year but not an empty one', () => {
    const result = checkRoster({ ...base, rows: [row('a', 'Ava', '20'), row('b', 'Leo', '')] });
    expect(result.rows).toEqual({ a: 'birthYear' });
  });

  it('flags list issues: class year, none, too many, no room', () => {
    expect(checkRoster({ ...base, classYear: '', rows: [] }).list).toEqual(['classYear', 'none']);
    const many = Array.from({ length: ROSTER_MAX_STUDENTS + 1 }, (_, i) => row(`r${i}`, `S${i}`));
    expect(checkRoster({ ...base, rows: many }).list).toEqual(['tooMany']);
    expect(checkRoster({ ...base, room: 1, rows: [row('a', 'A'), row('b', 'B')] }).list).toEqual([
      'noRoom',
    ]);
    expect(checkRoster({ ...base, room: 2, rows: [row('a', 'A'), row('b', 'B')] }).ok).toBe(true);
  });
});

describe('rosterBody', () => {
  it('sends trimmed nicknames and only real year overrides', () => {
    expect(
      rosterBody('2016', [
        row('a', '  Ava  Rose '),
        row('b', 'Noah', '2016'),
        row('c', 'Mia', '2015'),
      ]),
    ).toEqual({
      birth_year: 2016,
      students: [
        { nickname: 'Ava Rose' },
        { nickname: 'Noah' },
        { nickname: 'Mia', birth_year: 2015 },
      ],
    });
  });
});

describe('seatsLeft', () => {
  it('counts members and pending invites against the plan', () => {
    expect(seatsLeft(37, 2, 1)).toBe(34);
    expect(seatsLeft(37, 2, undefined)).toBe(35);
    expect(seatsLeft(3, 2, 4)).toBe(0);
    expect(seatsLeft(undefined, 2, 0)).toBeNull();
    expect(seatsLeft(37, undefined, 0)).toBeNull();
  });
});

describe('rosterServerErrors', () => {
  const rows = [row('a', 'Ava'), row('b', 'Noah'), row('c', 'Mia')];
  const err422 = (fieldErrors: Record<string, string[]>) =>
    new ApiError(422, 'Invalid', 'validation_failed', undefined, fieldErrors);

  it('maps students.N fields to the Nth submitted row', () => {
    const result = rosterServerErrors(
      err422({
        'students.1.nickname': ['That nickname is taken.'],
        'students.2.birth_year': ['Bad year.'],
      }),
      rows,
      t,
      null,
    );
    expect(result.rows).toEqual({ b: 'That nickname is taken.', c: 'Bad year.' });
    expect(result.general).toBeUndefined();
  });

  it('maps birth_year to the class year and other fields to the general message', () => {
    const result = rosterServerErrors(
      err422({ birth_year: ['Year needed.'], students: ['Too many students.'] }),
      rows,
      t,
      null,
    );
    expect(result.classYear).toBe('Year needed.');
    expect(result.general).toBe('Too many students.');
  });

  it('ignores row indexes outside the list but still says something', () => {
    const result = rosterServerErrors(err422({ 'students.9.nickname': ['x'] }), rows, t, null);
    expect(result.rows).toEqual({});
    expect(result.general).toBe('x');
  });

  it('names the seats left on 403 member_limit_reached', () => {
    const limit = new ApiError(403, 'Limit', 'member_limit_reached');
    expect(rosterServerErrors(limit, rows, t, 2).general).toBe(
      'classroom.roster.limitReached {"count":2}',
    );
    expect(rosterServerErrors(limit, rows, t, null).general).toBe('errors.memberLimitReached');
  });

  it('uses the shared messages for everything else', () => {
    const consent = new ApiError(409, 'Consent', 'classroom_consent_required');
    expect(rosterServerErrors(consent, rows, t, null).general).toBe(
      'errors.classroomConsentRequired',
    );
    expect(rosterServerErrors(null, rows, t, null)).toEqual({ rows: {} });
  });
});

describe('addPastedRows', () => {
  it('drops blank rows, appends new names and skips names already listed', () => {
    const next = addPastedRows([row('a', ''), row('b', 'Ava')], ['ava', 'Noah', 'noah', 'Mia']);
    expect(next.map((r) => r.nickname)).toEqual(['Ava', 'Noah', 'Mia']);
    expect(new Set(next.map((r) => r.key)).size).toBe(3);
  });

  it('keeps a row that only has a year', () => {
    expect(addPastedRows([row('a', '', '2015')], ['Leo']).map((r) => r.key)[0]).toBe('a');
  });
});
