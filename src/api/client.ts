import type { ApiErrorBody, ApiErrorCode } from '@/api/types';
import { API_URL, APP_VERSION } from '@/config/env';
import { useAppStatus } from '@/store/appStatus';
import { useSession } from '@/store/session';

/** Versioned API prefix of the Laravel backend. */
export const API_V1 = '/api/v1';

/** Client-side pseudo codes for failures that never reached the API contract. */
export type ClientErrorCode = 'network_error' | 'timeout' | 'unknown';

/**
 * Error thrown for every failed request.
 * - `status` is the HTTP status, or 0 for network errors / timeouts.
 * - `code` is the contract error code (see API.md) or a ClientErrorCode.
 * - `fieldErrors` holds the 422 `errors` object (field -> messages).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | ClientErrorCode | (string & {});
  readonly fieldErrors: Record<string, string[]>;
  readonly body: unknown;

  constructor(
    status: number,
    message: string,
    code: ApiError['code'],
    body?: unknown,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    this.fieldErrors = fieldErrors;
  }

  /** True when the request never got an HTTP answer (offline, DNS, timeout...). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** First message for a field from a 422 response. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }
}

export function isApiError(error: unknown, code?: ApiError['code']): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Abort the request after this many milliseconds (default 15 s). */
  timeoutMs?: number;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'message' in value;
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 401:
      return 'unauthenticated';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 422:
      return 'validation_failed';
    case 426:
      return 'app_update_required';
    default:
      return 'unknown';
  }
}

/**
 * Typed fetch wrapper for the v1 API.
 * - `path` is relative to `/api/v1` (e.g. `/me`).
 * - Sends JSON, the Sanctum Bearer token when signed in, and `X-App-Version`.
 * - Throws ApiError for non-2xx responses (status 0 for network errors/timeouts).
 * - 426 flips the global "update required" flag; 401 on an authenticated call signs out.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal, timeoutMs = 15_000 } = options;

  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const token = useSession.getState().token;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${API_V1}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-App-Version': APP_VERSION,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new ApiError(0, message, timedOut ? 'timeout' : 'network_error');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown;
  if (response.status !== 204) {
    payload = contentType.includes('application/json')
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined);
  }

  if (!response.ok) {
    const errorBody = isErrorBody(payload) ? payload : undefined;
    const code = errorBody?.code ?? defaultCodeForStatus(response.status);
    const message = errorBody?.message ?? `Request failed with status ${response.status}`;

    if (response.status === 426 || code === 'app_update_required') {
      useAppStatus.getState().setUpdateRequired(true);
    }
    // A rejected token means this device is signed out (revoked elsewhere, expired...).
    if (response.status === 401 && token && code === 'unauthenticated') {
      useSession.getState().clear();
    }

    throw new ApiError(response.status, message, code, payload, errorBody?.errors ?? {});
  }

  return payload as T;
}

type Opts = Omit<RequestOptions, 'method' | 'body'>;

export const api = {
  get: <T>(path: string, options?: Opts) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Opts) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Opts) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Opts) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = void>(path: string, options?: Opts) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

/** Unwraps the `{ data }` envelope. */
export async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  return (await promise).data;
}
