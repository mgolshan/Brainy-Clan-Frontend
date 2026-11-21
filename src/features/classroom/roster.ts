import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';
import type { RosterBody } from '@/api/types';
import { errorMessage } from '@/lib/errorMessage';

/**
 * Classroom roster form (B12 step 3, `POST /family/classroom/roster`), pure logic. The checks
 * here are hints only: the server decides (422 per row, 403 `member_limit_reached`).
 */

/** Students per request (contract: 1–35). */
export const ROSTER_MAX_STUDENTS = 35;
/** Nickname length in characters (Unicode code points, like the server's `max`). */
export const NICKNAME_MAX = 40;

export interface RosterRow {
  /** Stable key for the list (rows can be removed). */
  key: string;
  nickname: string;
  /** Per-student override, digits as typed; '' = the class year. */
  birthYear: string;
}

export type RowIssue = 'empty' | 'tooLong' | 'duplicate' | 'taken' | 'birthYear';
export type ListIssue = 'none' | 'tooMany' | 'noRoom' | 'classYear';

/** Length in characters (code points), so an emoji counts like the server counts it. */
export function charLength(text: string): number {
  return [...text].length;
}

/** Nicknames compare without case and surrounding spaces. */
export function nicknameKey(nickname: string): string {
  return nickname.trim().toLocaleLowerCase();
}

/**
 * One nickname per line from a pasted class list. Trims each line, drops empty lines and a
 * leading list marker (`1.`, `2)`, `-`, `*`, `•`) that spreadsheets and documents often add.
 */
export function parseRosterText(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:\d{1,3}[.)]|[-*•])\s+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => line.length > 0);
}

/** A plausible 4-digit birth year (not in the future, at most 100 years back). */
export function isBirthYear(value: string, now: Date = new Date()): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  const current = now.getFullYear();
  return year <= current && year >= current - 100;
}

export interface RosterCheck {
  /** Issue per row key (only rows with an issue). */
  rows: Record<string, RowIssue>;
  /** Issues with the whole list. */
  list: ListIssue[];
  /** No hint stops sending (the server still decides). */
  ok: boolean;
}

/**
 * Client-side hints for the roster form.
 * - `existing`: nicknames already in the family (members, and pending invites).
 * - `room`: seats left on the plan (`null` = unknown, then the server decides).
 */
export function checkRoster(args: {
  classYear: string;
  rows: readonly RosterRow[];
  existing: readonly string[];
  room: number | null;
  now?: Date;
}): RosterCheck {
  const { classYear, rows, existing, room, now } = args;
  const taken = new Set(existing.map(nicknameKey));
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = nicknameKey(row.nickname);
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const rowIssues: Record<string, RowIssue> = {};
  for (const row of rows) {
    const key = nicknameKey(row.nickname);
    let issue: RowIssue | null = null;
    if (!key) issue = 'empty';
    else if (charLength(row.nickname.trim()) > NICKNAME_MAX) issue = 'tooLong';
    else if ((seen.get(key) ?? 0) > 1) issue = 'duplicate';
    else if (taken.has(key)) issue = 'taken';
    else if (row.birthYear !== '' && !isBirthYear(row.birthYear, now)) issue = 'birthYear';
    if (issue) rowIssues[row.key] = issue;
  }

  const list: ListIssue[] = [];
  if (!isBirthYear(classYear, now)) list.push('classYear');
  if (rows.length === 0) list.push('none');
  if (rows.length > ROSTER_MAX_STUDENTS) list.push('tooMany');
  if (room !== null && rows.length > room) list.push('noRoom');

  return { rows: rowIssues, list, ok: list.length === 0 && Object.keys(rowIssues).length === 0 };
}

/** Request body: trimmed nicknames; a student's year only when it differs from the class year. */
export function rosterBody(classYear: string, rows: readonly RosterRow[]): RosterBody {
  const year = Number(classYear);
  return {
    birth_year: year,
    students: rows.map((row) => {
      const nickname = row.nickname.trim().replace(/\s+/g, ' ');
      const own = row.birthYear === '' ? null : Number(row.birthYear);
      return own !== null && own !== year ? { nickname, birth_year: own } : { nickname };
    }),
  };
}

/** Seats left: plan members minus members and pending invites; `null` when unknown. */
export function seatsLeft(
  maxMembers: number | null | undefined,
  members: number | null | undefined,
  invites: number | null | undefined,
): number | null {
  if (typeof maxMembers !== 'number' || typeof members !== 'number') return null;
  return Math.max(0, maxMembers - members - (invites ?? 0));
}

export interface RosterServerErrors {
  /** Server message per row key (`students.3.nickname` → the 4th row). */
  rows: Record<string, string>;
  /** Message for the class birth year (`birth_year`). */
  classYear?: string;
  /** Anything else (limit, consent, network...). */
  general?: string;
}

const ROW_FIELD = /^students\.(\d+)(?:\.(nickname|birth_year))?$/;

/**
 * Splits a failed roster request into per-row messages (422 `students.N.nickname` /
 * `students.N.birth_year`), the class year message (422 `birth_year`) and a general message
 * (403 `member_limit_reached` names the seats left when known; other errors as usual).
 */
export function rosterServerErrors(
  error: unknown,
  rows: readonly RosterRow[],
  t: TFunction,
  room: number | null,
): RosterServerErrors {
  const result: RosterServerErrors = { rows: {} };
  if (!error) return result;
  if (!(error instanceof ApiError)) {
    result.general = errorMessage(error, t);
    return result;
  }
  if (error.code === 'member_limit_reached') {
    result.general =
      room !== null
        ? t('classroom.roster.limitReached', { count: room })
        : t('errors.memberLimitReached');
    return result;
  }
  if (error.status === 422) {
    const other: string[] = [];
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      const message = messages[0];
      if (!message) continue;
      const match = ROW_FIELD.exec(field);
      const row = match ? rows[Number(match[1])] : undefined;
      if (row) {
        result.rows[row.key] ??= message;
      } else if (field === 'birth_year') {
        result.classYear = message;
      } else {
        other.push(message);
      }
    }
    if (other.length > 0) result.general = other[0];
    else if (Object.keys(result.rows).length === 0 && !result.classYear) {
      result.general = errorMessage(error, t);
    }
    return result;
  }
  result.general = errorMessage(error, t);
  return result;
}

let rowSeq = 0;

/** A new row with a unique key. */
export function newRow(nickname = '', birthYear = ''): RosterRow {
  rowSeq += 1;
  return { key: `row-${rowSeq}`, nickname, birthYear };
}

/**
 * Adds pasted nicknames as rows: drops blank rows (no nickname, no year), then appends; skips
 * names already in the list (same nickname key) so pasting twice doesn't double the class.
 */
export function addPastedRows(rows: readonly RosterRow[], names: readonly string[]): RosterRow[] {
  const present = new Set(rows.map((r) => nicknameKey(r.nickname)).filter(Boolean));
  const fresh: string[] = [];
  for (const name of names) {
    const key = nicknameKey(name);
    if (!present.has(key)) {
      present.add(key);
      fresh.push(name);
    }
  }
  const next = rows.filter((r) => nicknameKey(r.nickname) !== '' || r.birthYear !== '');
  return [...next, ...fresh.map((name) => newRow(name))];
}
