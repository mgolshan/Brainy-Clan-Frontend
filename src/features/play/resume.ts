import type { PlaySession, SessionStatus } from '@/api/types';
import { sessionProgressCaption } from '@/features/play/progress';
import type { ThemeKey } from '@/ui/themes/types';

/** Sessions the member can still go back to ("Continue your game"). */
export function isUnfinished(status: SessionStatus): boolean {
  return status === 'active' || status === 'failed' || status === 'redemption';
}

type Copy = 'title' | 'continue' | 'endConfirm';
type CopyKey = `play.resume.${Copy}` | `play.resume.${Copy}Kid`;

/** Status line under the progress: lives left, out of lives, or the redemption round. */
export type ResumeStatus =
  | { key: 'play.resume.lives'; options: { count: number; total: number } }
  | { key: 'play.resume.outOfLives' | 'play.resume.redemption'; options?: undefined };

export interface ResumeCardModel {
  title: CopyKey;
  continueLabel: CopyKey;
  endConfirmLabel: CopyKey;
  progress: ReturnType<typeof sessionProgressCaption>;
  /** 0..1 toward the target points. */
  fraction: number;
  status: ResumeStatus;
}

/**
 * What the "Continue your game" card shows for a session: kid-friendly wording in the playful
 * theme, progress toward the target and the lives left (or why the game is paused).
 */
export function resumeCardModel(session: PlaySession, themeKey: ThemeKey): ResumeCardModel {
  const kid = themeKey === 'playful';
  const copy = (key: Copy): CopyKey => (kid ? `play.resume.${key}Kid` : `play.resume.${key}`);
  const target = session.target_points;
  const points = session.points ?? 0;
  const mistakes = session.mistakes ?? 0;
  let status: ResumeStatus;
  if (session.status === 'redemption') status = { key: 'play.resume.redemption' };
  else if (session.status === 'failed') status = { key: 'play.resume.outOfLives' };
  else {
    status = {
      key: 'play.resume.lives',
      options: { count: Math.max(0, session.blunder_cap - mistakes), total: session.blunder_cap },
    };
  }
  return {
    title: copy('title'),
    continueLabel: copy('continue'),
    endConfirmLabel: copy('endConfirm'),
    progress: sessionProgressCaption(points, target),
    fraction: target > 0 ? Math.min(1, Math.max(0, points / target)) : 0,
    status,
  };
}
