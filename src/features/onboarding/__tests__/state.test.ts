import { ApiError } from '@/api/client';
import type { Onboarding } from '@/api/types';
import {
  isOnboardingMissing,
  parseOnboarding,
  pendingKeys,
  withDismissed,
  withRestored,
  withStepDone,
} from '@/features/onboarding/state';

const NOW = '2026-11-21T12:00:00.000Z';
const base: Onboarding = {
  steps: { welcome: '2026-11-20T10:00:00Z', pick_world: null },
  dismissed_at: null,
};

describe('parseOnboarding', () => {
  it('keeps the contract shape', () => {
    expect(
      parseOnboarding({
        steps: { welcome: '2026-11-20T10:00:00Z', first_game: null },
        dismissed_at: null,
      }),
    ).toEqual({ steps: { welcome: '2026-11-20T10:00:00Z', first_game: null }, dismissed_at: null });
  });

  it('reads anything unexpected as "not done" instead of crashing', () => {
    expect(parseOnboarding(null)).toEqual({ steps: {}, dismissed_at: null });
    expect(parseOnboarding('nope')).toEqual({ steps: {}, dismissed_at: null });
    expect(parseOnboarding({ steps: [] })).toEqual({ steps: {}, dismissed_at: null });
    expect(
      parseOnboarding({ steps: { welcome: true, roster: 3, tip_play: '' }, dismissed_at: 7 }),
    ).toEqual({ steps: { welcome: null, roster: null, tip_play: null }, dismissed_at: null });
  });
});

describe('parseOnboarding (server flow and steps)', () => {
  it('keeps the server flow and step lists', () => {
    expect(
      parseOnboarding({
        steps: {},
        dismissed_at: null,
        flow: 'teacher',
        required_steps: ['classroom_welcome', 'roster'],
        optional_steps: ['co_admin'],
      }),
    ).toEqual({
      steps: {},
      dismissed_at: null,
      flow: 'teacher',
      required_steps: ['classroom_welcome', 'roster'],
      optional_steps: ['co_admin'],
    });
  });

  it('drops unknown step keys, duplicates and optional steps that are also required', () => {
    const parsed = parseOnboarding({
      steps: {},
      flow: 'owner',
      required_steps: ['welcome', 'teleport', 'welcome', 7, 'first_game'],
      optional_steps: ['first_game', 'co_admin', 'mystery'],
    });
    expect(parsed.required_steps).toEqual(['welcome', 'first_game']);
    expect(parsed.optional_steps).toEqual(['co_admin']);
  });

  it('defaults a missing optional list to empty', () => {
    expect(
      parseOnboarding({ steps: {}, flow: 'member', required_steps: ['welcome_family'] })
        .optional_steps,
    ).toEqual([]);
  });

  it('ignores an unknown flow (and its lists): the app derives them', () => {
    const parsed = parseOnboarding({
      steps: {},
      flow: 'astronaut',
      required_steps: ['welcome'],
    });
    expect(parsed).toEqual({ steps: {}, dismissed_at: null });
    expect('flow' in parsed).toBe(false);
  });

  it('keeps a known flow without lists (older lists absent)', () => {
    const parsed = parseOnboarding({ steps: {}, flow: 'student', required_steps: 'nope' });
    expect(parsed.flow).toBe('student');
    expect(parsed.required_steps).toBeUndefined();
  });
});

describe('isOnboardingMissing (older server)', () => {
  it('is true for a 404 only', () => {
    expect(isOnboardingMissing(new ApiError(404, 'Not found', 'not_found'))).toBe(true);
    expect(isOnboardingMissing(new ApiError(422, 'Bad step', 'validation_failed'))).toBe(false);
    expect(isOnboardingMissing(new ApiError(0, 'offline', 'network_error'))).toBe(false);
    expect(isOnboardingMissing(new Error('boom'))).toBe(false);
  });
});

describe('optimistic updates', () => {
  it('marks steps done and keeps existing times', () => {
    const next = withStepDone(base, ['welcome', 'pick_world', 'upgrade_family'], NOW);
    expect(next.steps).toEqual({
      welcome: '2026-11-20T10:00:00Z',
      pick_world: NOW,
      upgrade_family: NOW,
    });
    expect(base.steps.pick_world).toBeNull(); // not mutated
  });

  it('returns the same object when nothing changes', () => {
    expect(withStepDone(base, ['welcome'], NOW)).toBe(base);
    expect(withStepDone(base, [], NOW)).toBe(base);
  });

  it('leaves "no data" (older server / not loaded) alone', () => {
    expect(withStepDone(null, ['welcome'], NOW)).toBeNull();
    expect(withStepDone(undefined, ['welcome'], NOW)).toBeUndefined();
    expect(withDismissed(null, NOW)).toBeNull();
  });

  it('dismisses once', () => {
    const dismissed = withDismissed(base, NOW);
    expect(dismissed.dismissed_at).toBe(NOW);
    expect(withDismissed(dismissed, '2030-01-01T00:00:00Z')).toBe(dismissed);
  });

  it('lists only the keys that still need a POST', () => {
    expect(pendingKeys(base, ['welcome', 'pick_world', 'tip_play'])).toEqual([
      'pick_world',
      'tip_play',
    ]);
    expect(pendingKeys(null, ['welcome'])).toEqual(['welcome']);
  });

  it('restores a dismissed checklist and keeps the progress', () => {
    const dismissed = { ...base, dismissed_at: NOW };
    const next = withRestored(dismissed);
    expect(next).toEqual({ ...base, dismissed_at: null });
    expect(dismissed.dismissed_at).toBe(NOW); // not mutated
    expect(withRestored(base)).toBe(base);
    expect(withRestored(null)).toBeNull();
  });
});
