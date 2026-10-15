import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  addNotificationTapListener,
  addTokenChangeListener,
  getPushPermission,
  type PushData,
  type PushPermissionState,
  registerIfGranted,
  requestPushPermission,
} from '@/features/notifications/push';

/**
 * While signed in: send the push token if permission was already granted (never prompts) and
 * re-send it when it changes. Silently does nothing on web, in Expo Go or without an EAS project.
 */
export function usePushRegistration(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    void registerIfGranted();
    return addTokenChangeListener();
  }, [signedIn]);
}

/** Push `data` → route. Unknown types open nothing. */
function openFromPush(data: PushData) {
  const goalId = Number(data.goal_id);
  switch (data.type) {
    case 'goal_reached':
    case 'period_closed':
      if (Number.isInteger(goalId) && goalId > 0) {
        router.push({ pathname: '/goals/[id]', params: { id: String(goalId) } });
      } else {
        router.navigate('/');
      }
      break;
    case 'family_activity':
      router.navigate('/');
      break;
    case 'daily_reminder':
      router.navigate('/play');
      break;
  }
}

/** Deep-link notification taps (including the one that cold-started the app) once routes exist. */
export function useNotificationDeepLinks(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    return addNotificationTapListener(openFromPush);
  }, [ready]);
}

/** Permission state for the Notifications screen, refreshed when the app comes back. */
export function usePushPermission() {
  const [state, setState] = useState<PushPermissionState | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      void getPushPermission().then((next) => {
        if (alive) setState(next);
      });
    refresh();
    // The member may have changed it in system settings.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const request = useCallback(async () => {
    setAsking(true);
    try {
      setState(await requestPushPermission());
    } finally {
      setAsking(false);
    }
  }, []);

  return { state, asking, request };
}

/** After a completed session: ask once, only if the OS has never asked. */
export async function askAfterSessionIfUndecided(): Promise<void> {
  const { status, canAskAgain } = await getPushPermission();
  if (status === 'undetermined' && canAskAgain) await requestPushPermission();
}
