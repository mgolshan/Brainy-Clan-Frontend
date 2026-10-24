import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import type { PushTokenBody } from '@/api/types';
import i18n from '@/i18n';

/**
 * Native push (Expo push service). `push.web.ts` replaces this file on web with no-ops.
 *
 * Push is skipped silently in Expo Go (remote push is unsupported there on Android), on
 * simulators and when no EAS `projectId` is configured (before `eas init`).
 */

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export interface PushPermissionState {
  status: PushPermission;
  /** False once the OS will no longer show the prompt (the member must use system settings). */
  canAskAgain: boolean;
}

const ANDROID_CHANNEL_ID = 'default';

function projectId(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined)
    ?.eas?.projectId;
  const id = typeof fromExtra === 'string' ? fromExtra : Constants.easConfig?.projectId;
  return id || undefined;
}

export function isPushSupported(): boolean {
  return (
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    Device.isDevice &&
    !!projectId()
  );
}

/** Show pushes as banners while the app is open (called once at startup). */
export function configureNotifications(): void {
  if (!isPushSupported()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android 13+ only shows the permission prompt once a channel exists. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: i18n.t('notifications.channelName'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getPushPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) return { status: 'unsupported', canAskAgain: false };
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return { status, canAskAgain };
  } catch {
    return { status: 'unsupported', canAskAgain: false };
  }
}

/** Last token sent to the server in this app run (avoids duplicate PUTs). */
let sentToken: string | null = null;

/** `PUT /me/push-token` (skipped when this token was already sent in this run). */
export async function sendPushToken(token: string): Promise<void> {
  if (token === sentToken) return;
  const body: PushTokenBody = { token, platform: Platform.OS };
  await api.put<void>('/me/push-token', body);
  sentToken = token;
}

/** Get the Expo push token and send it, if permission is already granted. Never prompts. */
export async function registerIfGranted(): Promise<boolean> {
  const id = projectId();
  if (!isPushSupported() || !id) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;
    await ensureChannel();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await sendPushToken(data);
    return true;
  } catch {
    // Best effort: retried on the next launch / token change.
    return false;
  }
}

/** Ask for permission (shows the OS prompt when allowed), then register. */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) return { status: 'unsupported', canAskAgain: false };
  try {
    await ensureChannel();
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') await registerIfGranted();
    return { status, canAskAgain };
  } catch {
    return getPushPermission();
  }
}

/** `DELETE /me/push-token` before signing out (best effort, short timeout). */
export async function unregisterPushToken(): Promise<void> {
  if (!isPushSupported() || !sentToken) return;
  try {
    await api.delete('/me/push-token', undefined, { timeoutMs: 4000 });
  } catch {
    // The server also clears it on logout.
  }
  sentToken = null;
}

/** Re-send when the OS rotates the push token. */
export function addTokenChangeListener(): () => void {
  if (!isPushSupported()) return () => undefined;
  // The listener gets the native device token; re-derive the Expo token from it.
  const sub = Notifications.addPushTokenListener(() => {
    sentToken = null;
    void registerIfGranted();
  });
  return () => sub.remove();
}

export interface PushData {
  type?: unknown;
  goal_id?: unknown;
  /** `family_chat`: the new message's id (the push never carries message text). */
  message_id?: unknown;
}

/** Calls `onData` for pushes that arrive while the app is open (e.g. refresh the chat). */
export function addNotificationReceivedListener(onData: (data: PushData) => void): () => void {
  if (!isPushSupported()) return () => undefined;
  const sub = Notifications.addNotificationReceivedListener((notification) =>
    onData((notification.request.content.data ?? {}) as PushData),
  );
  return () => sub.remove();
}

/** Calls `onOpen` for notification taps: the cold-start one, then every later tap. */
export function addNotificationTapListener(onOpen: (data: PushData) => void): () => void {
  if (!isPushSupported()) return () => undefined;
  let cancelled = false;
  const handled = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!response || cancelled) return;
    const id = response.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    onOpen((response.notification.request.content.data ?? {}) as PushData);
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  };
  void Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => {
    cancelled = true;
    sub.remove();
  };
}
