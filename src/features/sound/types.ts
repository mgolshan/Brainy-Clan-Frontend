/** Sound effect names and world sound packs (assets built by `npm run sounds:build`). */
import type { SoundPackKey } from '@/ui/themes/types';

export const SOUND_NAMES = ['tap', 'correct', 'wrong', 'celebrate', 'levelUp', 'unlock'] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

/** A world's pack is the theme token `theme.soundPack`. */
export type SoundPack = SoundPackKey;
export const SOUND_PACKS = [
  'candy',
  'jungle',
  'space',
  'neon',
  'glass',
  'calm',
] as const satisfies readonly SoundPack[];

export const DEFAULT_SOUND_PACK: SoundPack = 'candy';

export function isSoundPack(value: unknown): value is SoundPack {
  return typeof value === 'string' && (SOUND_PACKS as readonly string[]).includes(value);
}

/** A theme's pack, or the default for anything unknown / missing. */
export function resolveSoundPack(value: unknown): SoundPack {
  return isSoundPack(value) ? value : DEFAULT_SOUND_PACK;
}
