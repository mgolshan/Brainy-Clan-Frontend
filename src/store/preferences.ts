import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

/** Device-local UI preferences (not server data, never secrets). */
interface PreferencesState {
  colorScheme: ColorSchemePreference;
  setColorScheme: (value: ColorSchemePreference) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      colorScheme: 'system',
      setColorScheme: (colorScheme) => set({ colorScheme }),
    }),
    {
      name: 'brainyclan.preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
