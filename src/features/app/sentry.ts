import * as Sentry from '@sentry/react-native';

import { APP_VERSION } from '@/config/env';

/**
 * Error monitoring (README "Error monitoring — Sentry setup"). Off unless
 * `EXPO_PUBLIC_SENTRY_DSN` is set. Privacy rules for a family app with children:
 * - `sendDefaultPii: false` (no IP address, cookies or user names from integrations);
 * - request bodies, headers (the Bearer token), cookies and query strings are stripped;
 * - the only user field ever sent is the family member id (`setMonitoringMember`), never a
 *   nickname, display name or email — the same for children and adults;
 * - no screenshots / view hierarchy (they could show names), no performance tracing.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

export const monitoringEnabled = DSN.length > 0;

/** Drops `?query` and `#hash` (codes, tokens or emails could ride in a URL). */
function stripQuery(url: string | undefined): string | undefined {
  return url?.replace(/[?#].*$/, '');
}

function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.request) {
    event.request = { method: event.request.method, url: stripQuery(event.request.url) };
  }
  // Whatever an integration attached: keep only the member id.
  event.user = event.user?.id !== undefined ? { id: event.user.id } : undefined;
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb);
  return event;
}

function scrubBreadcrumb(crumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  if (crumb.category === 'fetch' || crumb.category === 'xhr') {
    const data = crumb.data ?? {};
    return {
      ...crumb,
      data: {
        method: data.method,
        url: typeof data.url === 'string' ? stripQuery(data.url) : undefined,
        status_code: data.status_code,
      },
    };
  }
  // Console output can contain anything (payloads, names): keep only the level.
  if (crumb.category === 'console') return { ...crumb, message: undefined, data: undefined };
  return crumb;
}

export function initMonitoring() {
  if (!monitoringEnabled) return;
  Sentry.init({
    dsn: DSN,
    release: `brainy-clan@${APP_VERSION}`,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  });
}

/** Tags errors with the signed-in family member id only (`null` = signed out / no family). */
export function setMonitoringMember(memberId: number | null) {
  if (!monitoringEnabled) return;
  Sentry.setUser(memberId === null ? null : { id: String(memberId) });
}

/** Wraps the root component (error boundary + touch breadcrumbs) when monitoring is on. */
export function withMonitoring<P extends Record<string, unknown>>(
  root: React.ComponentType<P>,
): React.ComponentType<P> {
  return monitoringEnabled ? Sentry.wrap(root) : root;
}
