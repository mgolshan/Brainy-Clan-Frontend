/**
 * Privacy scrubbers for Sentry events and breadcrumbs (pure, no SDK import, so they are unit
 * tested). Request bodies are never kept — that covers family chat messages, whose text must
 * never reach Sentry, logs or analytics.
 */

/** The fields of Sentry's `Breadcrumb` these scrubbers touch. */
export interface CrumbLike {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** The fields of Sentry's `ErrorEvent` these scrubbers touch. */
export interface EventLike {
  request?: { method?: string; url?: string; [key: string]: unknown };
  user?: { id?: string | number; [key: string]: unknown };
  breadcrumbs?: CrumbLike[];
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Drops `?query` and `#hash` (codes, tokens or emails could ride in a URL). */
export function stripQuery(url: string | undefined): string | undefined {
  return url?.replace(/[?#].*$/, '');
}

/** Family chat API calls: their payloads hold message text. */
export function isChatUrl(url: unknown): boolean {
  return typeof url === 'string' && url.includes('/family/chat');
}

export function scrubBreadcrumb<T extends CrumbLike>(crumb: T): T {
  if (crumb.category === 'fetch' || crumb.category === 'xhr') {
    const data = crumb.data ?? {};
    // Only method, path and status: never request/response bodies (chat text, answers...).
    return {
      ...crumb,
      message: undefined,
      data: {
        method: data.method,
        url: typeof data.url === 'string' ? stripQuery(data.url) : undefined,
        status_code: data.status_code,
      },
    };
  }
  // Console output can contain anything (payloads, names): keep only the level.
  if (crumb.category === 'console') return { ...crumb, message: undefined, data: undefined };
  // Anything else that mentions the chat endpoints or carries a `body`: drop the details.
  if (
    (crumb.data && 'body' in crumb.data) ||
    isChatUrl(crumb.message) ||
    isChatUrl(crumb.data?.url)
  ) {
    return { ...crumb, message: undefined, data: undefined };
  }
  return crumb;
}

export function scrubEvent<T extends EventLike>(event: T): T {
  if (event.request) {
    event.request = { method: event.request.method, url: stripQuery(event.request.url) };
  }
  // Whatever an integration attached: keep only the member id.
  event.user = event.user?.id !== undefined ? { id: event.user.id } : undefined;
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb);
  // Extra error data (e.g. an API error's payload) may hold a message body.
  if (event.extra) {
    const { body: _body, ...rest } = event.extra;
    event.extra = rest;
  }
  return event;
}
