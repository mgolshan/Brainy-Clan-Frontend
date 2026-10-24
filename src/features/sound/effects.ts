import type { Theme } from '@/ui/themes/types';

import { playHaptic, playSound } from './engine';
import { resolveSoundPack, type SoundName, type SoundPack } from './types';

/** Pure core of `useSoundEffects().play()`: nothing at all happens when sound effects are off. */
export function playEffect(enabled: boolean, pack: SoundPack, name: SoundName, rate?: number) {
  if (!enabled) return;
  playSound(pack, name, rate);
  playHaptic(name);
}

/**
 * The pack of a theme (`theme.soundPack`); anything unknown (e.g. a newer world served before the
 * app knows it) falls back to `candy`.
 */
export function themeSoundPack(theme: Pick<Theme, 'soundPack'> | null | undefined): SoundPack {
  return resolveSoundPack(theme?.soundPack);
}
