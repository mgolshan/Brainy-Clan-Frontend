import { useCallback, useEffect, useMemo } from 'react';

import { useMe } from '@/features/auth/hooks';
import { useTheme } from '@/ui/ThemeProvider';

import { playEffect, themeSoundPack } from './effects';
import { preloadPack } from './engine';
import { resolveSoundEnabled } from './settings';
import type { SoundName } from './types';

export interface SoundEffects {
  /** member `accessibility.sound_effects` ?? policy `accessibility_defaults.sound_effects` ?? false */
  enabled: boolean;
  /** Plays the effect from the current world's pack (+ its haptic); a no-op when disabled. */
  play(name: SoundName): void;
}

/** Sound effects of the signed-in member's current world. Preloads the pack while enabled. */
export function useSoundEffects(): SoundEffects {
  const me = useMe().data;
  const theme = useTheme();
  const enabled = resolveSoundEnabled(me?.policy, me?.member);
  const pack = themeSoundPack(theme);

  useEffect(() => {
    if (enabled) preloadPack(pack);
  }, [enabled, pack]);

  const play = useCallback((name: SoundName) => playEffect(enabled, pack, name), [enabled, pack]);
  return useMemo(() => ({ enabled, play }), [enabled, play]);
}
