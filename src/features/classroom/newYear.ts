import type { NewYearBody, NewYearClear } from '@/api/types';

/**
 * "Archive & start a new year" wizard (B12 step 3, `POST /family/classroom/new-year`), pure
 * logic: the flags, what will happen, and the typed class-name confirmation.
 */

export type ClearKey = keyof NewYearClear;

/** The order the wizard lists the flags in. */
export const CLEAR_KEYS: readonly ClearKey[] = ['students', 'points', 'chat', 'goals'];

/** The wizard starts with nothing chosen: the teacher picks what to clear. */
export const NO_CLEAR: NewYearClear = { students: false, points: false, chat: false, goals: false };

/** The contract needs at least one flag. */
export function anyClear(clear: NewYearClear): boolean {
  return CLEAR_KEYS.some((key) => clear[key]);
}

/** One line of the "what will happen" summary; `tone` tells deleted from kept. */
export interface NewYearLine {
  /** Key under `classroom.newYear.summary`. */
  key:
    | 'studentsRemoved'
    | 'studentsKept'
    | 'pointsSeason'
    | 'pointsKept'
    | 'chatDeleted'
    | 'chatKept'
    | 'goalsDeleted'
    | 'goalsKept'
    | 'teachersKept'
    | 'historyKept';
  tone: 'clear' | 'keep';
  /** For plural strings (students removed). */
  count?: number;
}

/**
 * The explicit summary shown before confirming: first what is cleared, then what is kept.
 * Clearing points starts a new season; the points history itself is never erased, so that
 * line is always there when points are cleared.
 */
export function newYearSummary(clear: NewYearClear, studentsCount: number): NewYearLine[] {
  const cleared: NewYearLine[] = [];
  const kept: NewYearLine[] = [{ key: 'teachersKept', tone: 'keep' }];
  if (clear.students) cleared.push({ key: 'studentsRemoved', tone: 'clear', count: studentsCount });
  else kept.push({ key: 'studentsKept', tone: 'keep', count: studentsCount });
  if (clear.points) {
    cleared.push({ key: 'pointsSeason', tone: 'clear' });
    kept.push({ key: 'historyKept', tone: 'keep' });
  } else kept.push({ key: 'pointsKept', tone: 'keep' });
  if (clear.chat) cleared.push({ key: 'chatDeleted', tone: 'clear' });
  else kept.push({ key: 'chatKept', tone: 'keep' });
  if (clear.goals) cleared.push({ key: 'goalsDeleted', tone: 'clear' });
  else kept.push({ key: 'goalsKept', tone: 'keep' });
  return [...cleared, ...kept];
}

/** Same rule as the server: equal to the class name, ignoring case and surrounding spaces. */
export function confirmNameMatches(typed: string, className: string): boolean {
  const a = typed.trim().toLocaleLowerCase();
  return a.length > 0 && a === className.trim().toLocaleLowerCase();
}

export function newYearBody(typed: string, clear: NewYearClear): NewYearBody {
  return { confirm_name: typed.trim(), clear: { ...clear } };
}

/** Wizard steps: choose → review (summary + export suggestion) → confirm (type the name). */
export type NewYearStep = 'choose' | 'review' | 'confirm';

export function nextNewYearStep(step: NewYearStep): NewYearStep {
  return step === 'choose' ? 'review' : 'confirm';
}

export function previousNewYearStep(step: NewYearStep): NewYearStep | null {
  if (step === 'confirm') return 'review';
  if (step === 'review') return 'choose';
  return null;
}
