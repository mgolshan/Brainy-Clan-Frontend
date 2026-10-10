import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '@/store/secureStorage';

interface SessionState {
  /** Sanctum personal access token, or null when signed out. */
  token: string | null;
  setToken: (token: string | null) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clear: () => set({ token: null }),
    }),
    {
      // SecureStore keys may only contain alphanumerics, ".", "-" and "_".
      name: 'brainyclan.session',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
