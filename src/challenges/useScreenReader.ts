import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether VoiceOver / TalkBack is on (always false on web, where it can't be detected). */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (alive) setEnabled(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
