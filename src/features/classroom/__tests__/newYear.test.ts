import {
  anyClear,
  confirmNameMatches,
  newYearBody,
  newYearSummary,
  nextNewYearStep,
  NO_CLEAR,
  previousNewYearStep,
} from '@/features/classroom/newYear';
import en from '@/i18n/locales/en.json';

const keys = (lines: ReturnType<typeof newYearSummary>) => lines.map((l) => `${l.tone}:${l.key}`);

describe('new-year flags', () => {
  it('needs at least one flag', () => {
    expect(anyClear(NO_CLEAR)).toBe(false);
    expect(anyClear({ ...NO_CLEAR, goals: true })).toBe(true);
  });

  it('starts with nothing chosen', () => {
    expect(NO_CLEAR).toEqual({ students: false, points: false, chat: false, goals: false });
  });
});

describe('newYearSummary', () => {
  it('lists everything cleared first, then what stays', () => {
    const lines = newYearSummary({ students: true, points: true, chat: true, goals: true }, 28);
    expect(keys(lines)).toEqual([
      'clear:studentsRemoved',
      'clear:pointsSeason',
      'clear:chatDeleted',
      'clear:goalsDeleted',
      'keep:teachersKept',
      'keep:historyKept',
    ]);
    expect(lines[0].count).toBe(28);
  });

  it('says the points history is kept whenever a new season starts', () => {
    const lines = newYearSummary({ ...NO_CLEAR, points: true }, 5);
    expect(keys(lines)).toEqual([
      'clear:pointsSeason',
      'keep:teachersKept',
      'keep:studentsKept',
      'keep:historyKept',
      'keep:chatKept',
      'keep:goalsKept',
    ]);
    expect(lines.find((l) => l.key === 'studentsKept')?.count).toBe(5);
  });

  it('has a string for every line', () => {
    const summary = en.classroom.newYear.summary as Record<string, string>;
    const lines = [
      ...newYearSummary({ students: true, points: true, chat: true, goals: true }, 2),
      ...newYearSummary(NO_CLEAR, 2),
    ];
    for (const line of lines) {
      const plural = line.count !== undefined;
      expect(summary[plural ? `${line.key}_other` : line.key]).toBeDefined();
    }
  });
});

describe('confirmNameMatches', () => {
  it('ignores case and surrounding spaces, like the server', () => {
    expect(confirmNameMatches('  grade 4b ', 'Grade 4B')).toBe(true);
    expect(confirmNameMatches('Grade 4B', ' Grade 4B ')).toBe(true);
    expect(confirmNameMatches('Grade 4', 'Grade 4B')).toBe(false);
    expect(confirmNameMatches('Grade  4B', 'Grade 4B')).toBe(false);
    expect(confirmNameMatches('', '')).toBe(false);
  });

  it('sends the typed name trimmed with a copy of the flags', () => {
    const clear = { ...NO_CLEAR, chat: true };
    const body = newYearBody(' Grade 4B ', clear);
    expect(body).toEqual({ confirm_name: 'Grade 4B', clear });
    expect(body.clear).not.toBe(clear);
  });
});

describe('wizard steps', () => {
  it('goes choose → review → confirm and back', () => {
    expect(nextNewYearStep('choose')).toBe('review');
    expect(nextNewYearStep('review')).toBe('confirm');
    expect(previousNewYearStep('confirm')).toBe('review');
    expect(previousNewYearStep('review')).toBe('choose');
    expect(previousNewYearStep('choose')).toBeNull();
  });
});
