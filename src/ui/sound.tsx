import { createContext, useContext } from 'react';

/** Effect names (same as `SoundName` in `src/features/sound`). */
export type UiSoundName = 'tap' | 'correct' | 'wrong' | 'celebrate' | 'levelUp' | 'unlock';

const UiSoundContext = createContext<(name: UiSoundName) => void>(() => undefined);

/**
 * Lets base components (Button) play the world's sounds without importing features: the app
 * provides `useSoundEffects().play` here (`AppThemeProvider`); default is silent.
 */
export const UiSoundProvider = UiSoundContext.Provider;

export function useUiSound(): (name: UiSoundName) => void {
  return useContext(UiSoundContext);
}
