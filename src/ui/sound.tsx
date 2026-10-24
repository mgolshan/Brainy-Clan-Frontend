import { createContext, useContext } from 'react';

/** Effect names (same as `SoundName` in `src/features/sound`). */
export type UiSoundName = 'tap' | 'correct' | 'wrong' | 'celebrate' | 'levelUp' | 'unlock';

/** Plays a world effect; `rate` (optional, 0.5–2) shifts it like a note (pad tones). */
export type UiSoundPlayer = (name: UiSoundName, rate?: number) => void;

const UiSoundContext = createContext<UiSoundPlayer>(() => undefined);

/**
 * Lets base components (Button) play the world's sounds without importing features: the app
 * provides `useSoundEffects().play` here (`AppThemeProvider`); default is silent.
 */
export const UiSoundProvider = UiSoundContext.Provider;

export function useUiSound(): UiSoundPlayer {
  return useContext(UiSoundContext);
}
