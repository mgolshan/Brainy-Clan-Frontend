import type { PlaySession } from '@/api/types';
import { isUnfinished, resumeCardModel } from '@/features/play/resume';

function session(overrides: Partial<PlaySession> = {}): PlaySession {
  return {
    id: 7,
    category_id: 3,
    status: 'active',
    target_points: 10,
    blunder_cap: 3,
    mistakes: 1,
    points: 4,
    answered: 5,
    second_chances_used: 0,
    second_chance: { free_remaining_today: 1, ad_available: false, redemption_available: true },
    started_at: '2026-10-17T10:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

describe('isUnfinished', () => {
  it('is true for sessions the member can go back to', () => {
    expect(isUnfinished('active')).toBe(true);
    expect(isUnfinished('failed')).toBe(true);
    expect(isUnfinished('redemption')).toBe(true);
  });

  it('is false for finished sessions', () => {
    expect(isUnfinished('completed')).toBe(false);
    expect(isUnfinished('abandoned')).toBe(false);
  });
});

describe('resumeCardModel', () => {
  it('shows progress toward the target and the lives left', () => {
    const model = resumeCardModel(session(), 'modern');
    expect(model.progress).toEqual({ key: 'play.progress', options: { count: 4, target: 10 } });
    expect(model.fraction).toBeCloseTo(0.4);
    expect(model.status).toEqual({ key: 'play.resume.lives', options: { count: 2, total: 3 } });
  });

  it('uses kid-friendly copy in the playful theme only', () => {
    const kid = resumeCardModel(session(), 'playful');
    expect(kid.title).toBe('play.resume.titleKid');
    expect(kid.continueLabel).toBe('play.resume.continueKid');
    expect(kid.endConfirmLabel).toBe('play.resume.endConfirmKid');
    for (const theme of ['sleek', 'modern', 'classic'] as const) {
      const model = resumeCardModel(session(), theme);
      expect(model.title).toBe('play.resume.title');
      expect(model.continueLabel).toBe('play.resume.continue');
      expect(model.endConfirmLabel).toBe('play.resume.endConfirm');
    }
  });

  it('says why a failed or redemption game is paused instead of lives', () => {
    expect(resumeCardModel(session({ status: 'failed', mistakes: 3 }), 'modern').status).toEqual({
      key: 'play.resume.outOfLives',
    });
    expect(resumeCardModel(session({ status: 'redemption' }), 'modern').status).toEqual({
      key: 'play.resume.redemption',
    });
  });

  it('clamps the bar and lives, and handles a zero target', () => {
    const over = resumeCardModel(session({ points: 12, mistakes: 5 }), 'modern');
    expect(over.fraction).toBe(1);
    expect(over.progress.key).toBe('play.progressReached');
    expect(over.status).toEqual({ key: 'play.resume.lives', options: { count: 0, total: 3 } });
    expect(resumeCardModel(session({ target_points: 0 }), 'modern').fraction).toBe(0);
  });

  it('treats null counters from a brand-new session as 0', () => {
    const fresh = session({
      points: null as unknown as number,
      mistakes: null as unknown as number,
    });
    const model = resumeCardModel(fresh, 'modern');
    expect(model.progress.options.count).toBe(0);
    expect(model.status).toEqual({ key: 'play.resume.lives', options: { count: 3, total: 3 } });
  });
});
