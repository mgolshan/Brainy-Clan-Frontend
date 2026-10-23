import type { Member, Policy } from '@/api/types';
import type { Theme } from '@/ui/themes/types';
import {
  playHaptic,
  playSound,
  preloadPack,
  resetSoundEngineForTests,
} from '@/features/sound/engine';
import { resolveSoundEnabled } from '@/features/sound/settings';
import { SOUND_ASSETS } from '@/features/sound/soundAssets.generated';
import {
  DEFAULT_SOUND_PACK,
  isSoundPack,
  resolveSoundPack,
  SOUND_NAMES,
  SOUND_PACKS,
} from '@/features/sound/types';
import { playEffect, themeSoundPack } from '@/features/sound/effects';

const mockPlayers: { source: unknown; play: jest.Mock; seekTo: jest.Mock; remove: jest.Mock }[] =
  [];

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn((source: unknown) => {
    const player = {
      source,
      volume: 1,
      playing: false,
      currentTime: 0,
      play: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      remove: jest.fn(),
    };
    mockPlayers.push(player);
    return player;
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success' },
}));

const policy = (sound_effects?: boolean) =>
  ({ accessibility_defaults: { sound_effects } }) as unknown as Policy;
const member = (sound_effects?: boolean | null) =>
  ({ accessibility: { sound_effects } }) as unknown as Member;

beforeEach(() => {
  mockPlayers.length = 0;
  resetSoundEngineForTests();
  jest.clearAllMocks();
});

describe('resolveSoundEnabled', () => {
  it('uses the policy default when the member has no choice (null)', () => {
    expect(resolveSoundEnabled(policy(true), member(null))).toBe(true);
    expect(resolveSoundEnabled(policy(false), member(null))).toBe(false);
    expect(resolveSoundEnabled(policy(true), member(undefined))).toBe(true);
    expect(resolveSoundEnabled(policy(true), null)).toBe(true);
  });

  it('lets an explicit member choice win either way', () => {
    expect(resolveSoundEnabled(policy(true), member(false))).toBe(false);
    expect(resolveSoundEnabled(policy(false), member(true))).toBe(true);
  });

  it('is off when nothing is known (signed out, older backend)', () => {
    expect(resolveSoundEnabled(undefined, undefined)).toBe(false);
    expect(resolveSoundEnabled(policy(undefined), member(null))).toBe(false);
  });
});

describe('sound packs', () => {
  it('falls back to candy for unknown or missing packs', () => {
    expect(DEFAULT_SOUND_PACK).toBe('candy');
    expect(resolveSoundPack('space')).toBe('space');
    for (const bad of ['dubstep', '', null, undefined, 3]) {
      expect(isSoundPack(bad)).toBe(false);
      expect(resolveSoundPack(bad)).toBe('candy');
    }
    expect(themeSoundPack({ soundPack: 'neon' })).toBe('neon');
    expect(themeSoundPack({ soundPack: 'kazoo' } as unknown as Theme)).toBe('candy');
    expect(themeSoundPack({} as Theme)).toBe('candy');
    expect(themeSoundPack(null)).toBe('candy');
  });

  it('ships every sound of every pack (sizes are checked by npm run sounds:build)', () => {
    expect(Object.keys(SOUND_ASSETS).sort()).toEqual([...SOUND_PACKS].sort());
    for (const pack of SOUND_PACKS) {
      expect(Object.keys(SOUND_ASSETS[pack]).sort()).toEqual([...SOUND_NAMES].sort());
      for (const name of SOUND_NAMES) expect(SOUND_ASSETS[pack][name]).toBeDefined();
    }
  });
});

describe('playback', () => {
  it('play() is a no-op when sound effects are off', () => {
    const haptics = jest.requireMock('expo-haptics');
    playEffect(false, 'candy', 'correct');
    expect(mockPlayers).toHaveLength(0);
    expect(haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('plays the sound of the pack (and its haptic) when on', () => {
    playEffect(true, 'jungle', 'correct');
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
    expect(jest.requireMock('expo-audio').setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false }),
    );
  });

  it('reuses players, preloads a pack and releases the previous one', () => {
    preloadPack('space');
    expect(mockPlayers).toHaveLength(SOUND_NAMES.length);
    playSound('space', 'tap');
    expect(mockPlayers).toHaveLength(SOUND_NAMES.length);
    preloadPack('glass');
    expect(mockPlayers).toHaveLength(SOUND_NAMES.length * 2);
    expect(mockPlayers.slice(0, SOUND_NAMES.length).every((p) => p.remove.mock.calls.length)).toBe(
      true,
    );
  });

  it('never throws when audio or haptics fail', () => {
    const audio = jest.requireMock('expo-audio');
    audio.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no audio');
    });
    expect(() => playSound('neon', 'wrong')).not.toThrow();
    const haptics = jest.requireMock('expo-haptics');
    haptics.impactAsync.mockImplementationOnce(() => {
      throw new Error('no motor');
    });
    expect(() => playHaptic('wrong')).not.toThrow();
  });
});
