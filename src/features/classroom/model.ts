import type { ClassroomState, Family, Member } from '@/api/types';

/**
 * Classroom setup state (B12 step 3), pure logic. A Classroom is a family on the `classroom`
 * tier; its admins are the teachers. The server sets `family.classroom` only on that tier, so
 * the app shows the tools when that object is there and the viewer is an admin (the server
 * still answers 403 `plan_required` / `forbidden` otherwise).
 */

/** The family's Classroom state when the viewer is a teacher (admin) of a Classroom, else null. */
export function teacherClassroom(
  family: Pick<Family, 'classroom'> | null | undefined,
  isAdmin: boolean,
): ClassroomState | null {
  if (!isAdmin || !family?.classroom) return null;
  return family.classroom;
}

/**
 * Has a teacher accepted the **current** consent statement? `currentVersion` comes from
 * `GET /legal` `classroom_consent.version`; while it is unknown, any accepted version counts
 * (the server answers 409 `classroom_consent_required` if it is stale).
 */
export function consentAccepted(
  classroom: Pick<ClassroomState, 'consent_version'>,
  currentVersion: string | null | undefined,
): boolean {
  if (!classroom.consent_version) return false;
  return !currentVersion || classroom.consent_version === currentVersion;
}

/** True when a teacher accepted an older statement and must accept the new one. */
export function consentOutdated(
  classroom: Pick<ClassroomState, 'consent_version'>,
  currentVersion: string | null | undefined,
): boolean {
  return (
    !!classroom.consent_version && !!currentVersion && !consentAccepted(classroom, currentVersion)
  );
}

export type SetupStepKey = 'consent' | 'students' | 'codes';

export interface SetupStep {
  key: SetupStepKey;
  done: boolean;
  /** Can be opened now (every earlier step that blocks it is done). */
  enabled: boolean;
}

/**
 * The three first-time steps: accept the consent statement → add students → print code cards.
 * Students and codes need the consent (the server answers 409 without it); codes also need at
 * least one student.
 */
export function setupSteps(
  classroom: ClassroomState,
  currentVersion: string | null | undefined,
): SetupStep[] {
  const consent = consentAccepted(classroom, currentVersion);
  const hasStudents = classroom.students_count > 0;
  return [
    { key: 'consent', done: consent, enabled: true },
    { key: 'students', done: hasStudents, enabled: consent },
    { key: 'codes', done: !!classroom.codes_issued_at, enabled: consent && hasStudents },
  ];
}

/** The first step not done yet, or null when the class is set up. */
export function nextSetupStep(steps: readonly SetupStep[]): SetupStepKey | null {
  return steps.find((s) => !s.done)?.key ?? null;
}

/** Students: the non-admin members (what the server issues code cards for when no ids are sent). */
export function studentsOf<T extends Pick<Member, 'role'>>(members: readonly T[]): T[] {
  return members.filter((m) => m.role !== 'admin');
}
