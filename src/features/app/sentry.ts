import * as Sentry from '@sentry/react-native';

import {
  scrubBreadcrumb,
  scrubEvent,
  type CrumbLike,
  type EventLike,
} from '@/features/app/sentryScrub';
import { APP_VERSION } from '@/config/env';

/**
 * Error monitoring (README "Error monitoring — Sentry setup"). Off unless
 * `EXPO_PUBLIC_SENTRY_DSN` is set. Privacy rules for a family app with children:
 * - `sendDefaultPii: false` (no IP address, cookies or user names from integrations);
 * - request bodies, headers (the Bearer token), cookies and query strings are stripped;
 * - the only user field ever sent is the family member id (`setMonitoringMember`), never a
 *   nickname, display name or email — the same for children and adults;
 * - no screenshots / view hierarchy (they could show names), no performance tracing;
 * - family chat text never leaves the app: bodies are stripped, chat breadcrumbs keep no
 *   details (`sentryScrub.ts`).
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

export const monitoringEnabled = DSN.length > 0;

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
    beforeSend: (event) => scrubEvent(event as Sentry.ErrorEvent & EventLike),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb as Sentry.Breadcrumb & CrumbLike),
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
