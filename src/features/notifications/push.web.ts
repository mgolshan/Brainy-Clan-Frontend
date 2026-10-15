/** Web: no remote push. Same API as `push.ts`, all no-ops. */
import type { PushData, PushPermissionState } from './push';

export type { PushData, PushPermission, PushPermissionState } from './push';

export function isPushSupported(): boolean {
  return false;
}
export function configureNotifications(): void {}
export async function getPushPermission(): Promise<PushPermissionState> {
  return { status: 'unsupported', canAskAgain: false };
}
export async function sendPushToken(_token: string): Promise<void> {}
export async function registerIfGranted(): Promise<boolean> {
  return false;
}
export async function requestPushPermission(): Promise<PushPermissionState> {
  return { status: 'unsupported', canAskAgain: false };
}
export async function unregisterPushToken(): Promise<void> {}
export function addTokenChangeListener(): () => void {
  return () => undefined;
}
export function addNotificationTapListener(_onOpen: (data: PushData) => void): () => void {
  return () => undefined;
}
