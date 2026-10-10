import type { IsoDate, NavHistory, NavPoint, SchemeMeta, SchemeSearchResult } from '../domain/types';
import { ApiError } from './errors';
import { parseSchemeResponse, parseSearchResponse } from './parse';

/**
 * Thin fetch wrapper for mfapi.in: a timeout, cancellation, and typed errors.
 * Caching, retries and refetching belong to TanStack Query, not here.
 */

export const API_BASE_URL = 'https://api.mfapi.in';
export const DEFAULT_TIMEOUT_MS = 15_000;
/** Full histories can run to thousands of rows; give them a little longer. */
export const HISTORY_TIMEOUT_MS = 20_000;

export interface RequestOptions {
  /** Cancellation from the caller (TanStack Query passes one per query). */
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function getJson(path: string, options: RequestOptions = {}): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const forwardAbort = () => controller.abort();
  const external = options.signal;
  if (external?.aborted) controller.abort();
  else external?.addEventListener('abort', forwardAbort);

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (timedOut) throw new ApiError('timeout', `Timed out: ${path}`);
      // A caller cancellation is rethrown untouched; TanStack Query ignores it.
      if (external?.aborted) throw error;
      throw new ApiError('network', `Network request failed: ${path}`);
    }

    if (response.status === 429) throw new ApiError('rate_limited', 'Rate limited', 429);
    if (response.status === 404) throw new ApiError('not_found', `HTTP 404: ${path}`, 404);
    if (!response.ok) throw new ApiError('http', `HTTP ${response.status}: ${path}`, response.status);

    try {
      return await response.json();
    } catch (error) {
      if (timedOut) throw new ApiError('timeout', `Timed out reading: ${path}`);
      if (external?.aborted) throw error;
      throw new ApiError('bad_data', `Response was not JSON: ${path}`);
    }
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', forwardAbort);
  }
}

export async function searchSchemes(query: string, signal?: AbortSignal): Promise<SchemeSearchResult[]> {
  const json = await getJson(`/mf/search?q=${encodeURIComponent(query)}`, { signal });
  return parseSearchResponse(json);
}

export async function fetchNavHistory(schemeCode: number, signal?: AbortSignal): Promise<NavHistory> {
  const json = await getJson(`/mf/${schemeCode}`, { signal, timeoutMs: HISTORY_TIMEOUT_MS });
  return parseSchemeResponse(json, schemeCode);
}

/**
 * NAVs between two dates, inclusive (mfapi honours startDate/endDate; checked in Phase 0).
 * A few rows instead of thousands: list rows use it for the day's change.
 * A scheme with no NAV in the window (a closed one) returns no points, not an error.
 */
export async function fetchNavRange(
  schemeCode: number,
  from: IsoDate,
  to: IsoDate,
  signal?: AbortSignal,
): Promise<NavHistory> {
  const json = await getJson(`/mf/${schemeCode}?startDate=${from}&endDate=${to}`, { signal });
  return parseSchemeResponse(json, schemeCode);
}

export interface LatestNav {
  meta: SchemeMeta;
  /** Null when the scheme exists but has published no NAV. */
  point: NavPoint | null;
}

export async function fetchLatestNav(schemeCode: number, signal?: AbortSignal): Promise<LatestNav> {
  const json = await getJson(`/mf/${schemeCode}/latest`, { signal });
  const parsed = parseSchemeResponse(json, schemeCode);
  return { meta: parsed.meta, point: parsed.points[parsed.points.length - 1] ?? null };
}
