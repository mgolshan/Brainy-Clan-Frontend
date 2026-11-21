import { create } from 'zustand';

/**
 * The text typed in the chat composer, kept outside the composer (memory only, never stored):
 * when the chat mode changes mid-session (announcements, off) the composer is swapped for a
 * banner, and the text is still there when posting is possible again. Cleared on sign-out.
 */
interface ChatDraftState {
  text: string;
  setText: (text: string) => void;
  clear: () => void;
}

export const useChatDraft = create<ChatDraftState>()((set) => ({
  text: '',
  setText: (text) => set({ text }),
  clear: () => set({ text: '' }),
}));
