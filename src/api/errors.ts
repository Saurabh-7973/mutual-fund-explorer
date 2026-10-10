/**
 * Typed API failures. Screens show copy by `kind`, and the query client decides
 * retries by `kind`, so no screen ever shows a raw error string.
 */

export type ApiErrorKind =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'http'
  | 'not_found'
  | 'bad_data';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Retry only what can succeed on a second try: timeouts, network drops, 429 and 5xx. */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false;
  switch (error.kind) {
    case 'timeout':
    case 'network':
    case 'rate_limited':
      return true;
    case 'http':
      return error.status !== null && error.status >= 500;
    case 'not_found':
    case 'bad_data':
      return false;
  }
}

/** Backoff: 1 s, 2 s, 4 s (capped at 8 s); longer when the server asked us to slow down. */
export function retryDelayMs(attempt: number, error: unknown): number {
  if (isApiError(error) && error.kind === 'rate_limited') return 5_000 * (attempt + 1);
  return Math.min(1_000 * 2 ** attempt, 8_000);
}

export interface ErrorCopy {
  title: string;
  detail: string;
}

/** User-facing copy. `online` comes from the app's connectivity status. */
export function describeError(error: unknown, online = true): ErrorCopy {
  if (!online) {
    return { title: 'You’re offline', detail: 'Connect to the internet and try again. Saved data is still shown.' };
  }
  if (!isApiError(error)) {
    return { title: 'Something unexpected happened', detail: 'Try again. If it keeps happening, restart the app.' };
  }
  switch (error.kind) {
    case 'timeout':
      return { title: 'mfapi.in is taking too long', detail: 'It didn’t answer within 15 seconds. Try again.' };
    case 'network':
      return { title: 'Couldn’t reach mfapi.in', detail: 'Check your connection and try again.' };
    case 'rate_limited':
      return { title: 'Too many requests', detail: 'mfapi.in asked us to slow down. Wait a few seconds, then retry.' };
    case 'http':
      return {
        title: `mfapi.in returned an error${error.status !== null ? ` (HTTP ${error.status})` : ''}`,
        detail: 'This is usually temporary. Try again shortly.',
      };
    case 'not_found':
      return { title: 'Scheme not found', detail: 'mfapi.in has no scheme with this code.' };
    case 'bad_data':
      return { title: 'Unexpected data from mfapi.in', detail: 'The response didn’t look like NAV data. Try again later.' };
  }
}
