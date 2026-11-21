import type { ClassroomState } from '@/api/types';
import {
  consentAccepted,
  consentOutdated,
  nextSetupStep,
  setupSteps,
  studentsOf,
  teacherClassroom,
} from '@/features/classroom/model';

const state = (over: Partial<ClassroomState> = {}): ClassroomState => ({
  consent_version: null,
  consent_accepted_at: null,
  students_count: 0,
  codes_issued_at: null,
  season_started_at: null,
  ...over,
});

describe('teacherClassroom', () => {
  it('is the classroom state for an admin of a Classroom only', () => {
    const classroom = state();
    expect(teacherClassroom({ classroom }, true)).toBe(classroom);
    expect(teacherClassroom({ classroom }, false)).toBeNull();
    expect(teacherClassroom({ classroom: null }, true)).toBeNull();
    // Older backends don't send the field.
    expect(teacherClassroom({}, true)).toBeNull();
    expect(teacherClassroom(undefined, true)).toBeNull();
  });
});

describe('consent', () => {
  it('needs the current version once it is known', () => {
    expect(consentAccepted(state(), '2026-11-20')).toBe(false);
    expect(consentAccepted(state({ consent_version: '2026-11-20' }), '2026-11-20')).toBe(true);
    expect(consentAccepted(state({ consent_version: '2026-01-01' }), '2026-11-20')).toBe(false);
    // `GET /legal` not loaded: any accepted version counts (the server has the last word).
    expect(consentAccepted(state({ consent_version: '2026-01-01' }), undefined)).toBe(true);
  });

  it('is outdated only when an older version was accepted', () => {
    expect(consentOutdated(state({ consent_version: '2026-01-01' }), '2026-11-20')).toBe(true);
    expect(consentOutdated(state(), '2026-11-20')).toBe(false);
    expect(consentOutdated(state({ consent_version: '2026-11-20' }), '2026-11-20')).toBe(false);
    expect(consentOutdated(state({ consent_version: '2026-01-01' }), null)).toBe(false);
  });
});

describe('setupSteps', () => {
  const v = '2026-11-20';

  it('starts with the consent and locks the rest', () => {
    const steps = setupSteps(state(), v);
    expect(steps).toEqual([
      { key: 'consent', done: false, enabled: true },
      { key: 'students', done: false, enabled: false },
      { key: 'codes', done: false, enabled: false },
    ]);
    expect(nextSetupStep(steps)).toBe('consent');
  });

  it('unlocks students after the consent, codes after the first student', () => {
    const consented = setupSteps(state({ consent_version: v }), v);
    expect(consented.map((s) => s.enabled)).toEqual([true, true, false]);
    expect(nextSetupStep(consented)).toBe('students');
    const withStudents = setupSteps(state({ consent_version: v, students_count: 28 }), v);
    expect(withStudents.map((s) => s.enabled)).toEqual([true, true, true]);
    expect(nextSetupStep(withStudents)).toBe('codes');
  });

  it('is set up once the cards were printed', () => {
    const steps = setupSteps(
      state({ consent_version: v, students_count: 28, codes_issued_at: '2026-11-21T09:00:00Z' }),
      v,
    );
    expect(nextSetupStep(steps)).toBeNull();
  });

  it('asks for the consent again after a new statement version', () => {
    const steps = setupSteps(
      state({ consent_version: '2026-01-01', students_count: 3, codes_issued_at: 'x' }),
      v,
    );
    expect(nextSetupStep(steps)).toBe('consent');
    expect(steps.map((s) => s.enabled)).toEqual([true, false, false]);
  });
});

describe('studentsOf', () => {
  it('keeps the non-admin members', () => {
    expect(
      studentsOf([
        { id: 1, role: 'admin' as const },
        { id: 2, role: 'member' as const },
      ]).map((m) => m.id),
    ).toEqual([2]);
  });
});
