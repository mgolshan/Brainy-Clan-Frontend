import { ApiError } from '@/api/client';
import type { Onboarding } from '@/api/types';
import {
  isOnboardingMissing,
  parseOnboarding,
  pendingKeys,
  withDismissed,
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
});
