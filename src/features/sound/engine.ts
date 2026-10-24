/**
 * Sound effect playback (expo-audio) + matching haptics (expo-haptics). Fire-and-forget: nothing
 * here throws or blocks the UI; a failing player or a browser autoplay block is ignored.
 *
 * Players are created per pack on first use (`preloadPack`) and reused; switching the active pack
 * releases the previous pack's players. The audio session mixes with other apps and does not play
 * in iOS silent mode (`playsInSilentMode: false` — expo-audio defaults to true, which would ignore
 * the ring/silent switch).
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { SOUND_ASSETS } from './soundAssets.generated';
import { SOUND_NAMES, type SoundName, type SoundPack } from './types';

/** Modest: effects sit under speech/music and never startle. */
export const SOUND_VOLUME = 0.6;

const players = new Map<string, AudioPlayer>();
/** Playback rate last set per player (only touched when a caller asks for a non-1 rate). */
const rates = new Map<string, number>();
let activePack: SoundPack | null = null;
let modeSet = false;

const keyOf = (pack: SoundPack, name: SoundName) => `${pack}/${name}`;

function ensureAudioMode() {
  if (modeSet) return;
  modeSet = true;
  setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  }).catch(() => {
    modeSet = false;
  });
}

function playerFor(pack: SoundPack, name: SoundName): AudioPlayer | null {
  const key = keyOf(pack, name);
  const existing = players.get(key);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOUND_ASSETS[pack][name]);
    player.volume = SOUND_VOLUME;
    players.set(key, player);
    return player;
  } catch {
    return null;
  }
}

function release(key: string) {
  const player = players.get(key);
  players.delete(key);
  rates.delete(key);
  try {
    player?.remove();
  } catch {
    // already gone
  }
}

/** Load every sound of `pack` and drop the players of the previously active pack. */
export function preloadPack(pack: SoundPack) {
  if (activePack !== pack) {
    for (const key of [...players.keys()]) if (!key.startsWith(`${pack}/`)) release(key);
    activePack = pack;
  }
  ensureAudioMode();
  for (const name of SOUND_NAMES) playerFor(pack, name);
}

/**
 * Play one effect now (restarting it if it is still playing). Never throws. `rate` (0.5–2) plays
 * it faster/higher or slower/lower without pitch correction, e.g. one tone per pad in Pattern
 * Sequence; best-effort (a platform that can't change the rate plays it at 1).
 */
export function playSound(pack: SoundPack, name: SoundName, rate = 1) {
  ensureAudioMode();
  const key = keyOf(pack, name);
  const player = playerFor(pack, name);
  if (!player) return;
  const wanted = Math.min(2, Math.max(0.5, rate));
  if ((rates.get(key) ?? 1) !== wanted) {
    try {
      player.shouldCorrectPitch = false;
      player.setPlaybackRate(wanted);
      rates.set(key, wanted);
    } catch {
      // rate not supported here: plays at the normal rate
    }
  }
  try {
    if (player.playing || player.currentTime > 0) {
      player.seekTo(0).then(
        () => player.play(),
        () => undefined,
      );
    } else {
      player.play();
    }
  } catch {
    // audio unavailable (no output device, autoplay blocked, ...): stay silent
  }
}

/** Haptics that follow the sound toggle: light on correct, soft on wrong, success on rewards. */
export function playHaptic(name: SoundName) {
  if (Platform.OS === 'web') return;
  let done: Promise<void> | null = null;
  try {
    switch (name) {
      case 'correct':
        done = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'wrong':
        done = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        break;
      case 'celebrate':
      case 'levelUp':
      case 'unlock':
        done = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      default:
        // taps: buttons already give their own selection haptic
        break;
    }
  } catch {
    done = null;
  }
  done?.catch(() => undefined);
}

/** Test hook: forget every player (does not touch the native side). */
export function resetSoundEngineForTests() {
  players.clear();
  rates.clear();
  activePack = null;
  modeSet = false;
}
