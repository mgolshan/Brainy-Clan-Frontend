import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** `nativeID` of a challenge's root view; keys pressed while focus is inside it are handled. */
export const CHALLENGE_ROOT_ID = 'challenge-root';

/**
 * Physical keyboard support on web (digits, letters, Backspace, Enter, arrows) for challenges
 * that use an on-screen pad. Keys are handled when nothing is focused or the focus is inside the
 * challenge (its root view has `nativeID={CHALLENGE_ROOT_ID}`), so Enter on another focused
 * button (e.g. "Leave the game") keeps working. Text fields are left alone. No-op on native.
 * Return true from the handler when the key was used.
 */
export function useWebKeys(handler: (key: string) => boolean | void, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
      const outside =
        active && active !== document.body && !active.closest(`#${CHALLENGE_ROOT_ID}`);
      if (outside) return;
      if (latest.current(event.key)) {
        // Capture phase: a focused pad key must not also "press" itself on Enter.
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [enabled]);
}
