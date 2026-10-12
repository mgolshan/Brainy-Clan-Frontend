import { router, type Href } from 'expo-router';

/**
 * `router.back()` with a fallback for screens opened without history (web reload, deep link):
 * there `back()` is unhandled and the user would stay on a stale screen.
 */
export function goBack(fallback: Href = '/'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
