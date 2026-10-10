import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  HISTORY_PPFAS_FLEXI_DIRECT,
  LATEST_PPFAS_FLEXI_DIRECT,
  SEARCH_PARAG_PARIKH,
  UNKNOWN_SCHEME,
} from '../__fixtures__/mfapi';
import type { IsoDate } from '../../domain/types';
import { API_BASE_URL, fetchLatestNav, fetchNavHistory, fetchNavRange, getJson, searchSchemes } from '../client';
import { ApiError } from '../errors';

type Handler = (url: string, init: RequestInit | undefined) => Promise<unknown>;

const realFetch = globalThis.fetch;
let requests: { url: string; init: RequestInit | undefined }[] = [];

/** Replaces global fetch for one test. */
function serve(handler: Handler): void {
  const fake = (input: unknown, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    return handler(url, init);
  };
  globalThis.fetch = fake as unknown as typeof fetch;
}

/** Just enough of a fetch Response for the client: status, ok and json(). */
function reply(status: number, body: unknown): Promise<unknown> {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: () => (body instanceof Error ? Promise.reject(body) : Promise.resolve(body)),
  });
}

/** A request that never answers but rejects, as fetch does, when its signal aborts. */
function hang(_url: string, init: RequestInit | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    const abort = () => reject(new Error('Aborted'));
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort);
  });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to fail');
}

async function failure(promise: Promise<unknown>): Promise<{ kind: string; status: number | null }> {
  const error = await rejection(promise);
  return error instanceof ApiError ? { kind: error.kind, status: error.status } : { kind: 'not-an-ApiError', status: null };
}

beforeEach(() => {
  requests = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('getJson', () => {
  it('asks mfapi.in for JSON and returns the body', async () => {
    serve(() => reply(200, LATEST_PPFAS_FLEXI_DIRECT));
    await expect(getJson('/mf/122639/latest')).resolves.toEqual(LATEST_PPFAS_FLEXI_DIRECT);
    expect(requests[0]?.url).toBe(`${API_BASE_URL}/mf/122639/latest`);
    expect(requests[0]?.init?.headers).toEqual({ Accept: 'application/json' });
  });

  it('gives up on slow responses with a timeout error', async () => {
    serve(hang);
    expect(await failure(getJson('/mf/122639', { timeoutMs: 20 }))).toEqual({ kind: 'timeout', status: null });
  });

  it('rethrows a caller cancellation untouched, so TanStack Query can ignore it', async () => {
    serve(hang);
    const controller = new AbortController();
    const pending = getJson('/mf/122639', { signal: controller.signal });
    controller.abort();
    expect(await rejection(pending)).not.toBeInstanceOf(ApiError);
  });

  it('does not start waiting when the caller has already cancelled', async () => {
    serve(hang);
    const controller = new AbortController();
    controller.abort();
    expect(await rejection(getJson('/mf/122639', { signal: controller.signal }))).not.toBeInstanceOf(ApiError);
  });

  it('maps transport and HTTP failures to typed errors', async () => {
    serve(() => Promise.reject(new TypeError('Network request failed')));
    expect(await failure(getJson('/mf/1'))).toEqual({ kind: 'network', status: null });

    serve(() => reply(429, {}));
    expect(await failure(getJson('/mf/1'))).toEqual({ kind: 'rate_limited', status: 429 });

    serve(() => reply(503, {}));
    expect(await failure(getJson('/mf/1'))).toEqual({ kind: 'http', status: 503 });

    serve(() => reply(404, {}));
    expect(await failure(getJson('/mf/1'))).toEqual({ kind: 'not_found', status: 404 });

    serve(() => reply(200, new SyntaxError('Unexpected token < in JSON')));
    expect(await failure(getJson('/mf/1'))).toEqual({ kind: 'bad_data', status: null });
  });
});

describe('endpoints', () => {
  it('encodes the search text', async () => {
    serve(() => reply(200, SEARCH_PARAG_PARIKH));
    expect(await searchSchemes('parag parikh')).toHaveLength(15);
    expect(requests[0]?.url).toBe('https://api.mfapi.in/mf/search?q=parag%20parikh');

    serve(() => reply(200, []));
    expect(await searchSchemes('S&P 500 / index')).toEqual([]);
    expect(requests[1]?.url).toBe('https://api.mfapi.in/mf/search?q=S%26P%20500%20%2F%20index');
  });

  it('fetches and parses a full NAV history', async () => {
    serve(() => reply(200, HISTORY_PPFAS_FLEXI_DIRECT));
    const history = await fetchNavHistory(122639);
    expect(requests[0]?.url).toBe('https://api.mfapi.in/mf/122639');
    expect(history.points).toHaveLength(14);
    expect(history.points[0]?.date).toBe('2023-08-11');
  });

  it('returns the latest NAV, and not_found for an unknown code', async () => {
    serve(() => reply(200, LATEST_PPFAS_FLEXI_DIRECT));
    const latest = await fetchLatestNav(122639);
    expect(requests[0]?.url).toBe('https://api.mfapi.in/mf/122639/latest');
    expect(latest.point).toEqual({ date: '2026-10-09', nav: '88.92580', value: 88.9258 });
    expect(latest.meta.fundHouse).toBe('PPFAS Mutual Fund');

    serve(() => reply(200, UNKNOWN_SCHEME));
    expect((await failure(fetchLatestNav(99_999_999))).kind).toBe('not_found');
  });

  it('returns no latest point for a scheme that has published no NAV', async () => {
    serve(() => reply(200, { ...LATEST_PPFAS_FLEXI_DIRECT, data: [] }));
    expect((await fetchLatestNav(122639)).point).toBeNull();
  });
});

describe('fetchNavRange', () => {
  it('asks for the date window and parses the rows', async () => {
    serve(() => reply(200, HISTORY_PPFAS_FLEXI_DIRECT));
    const range = await fetchNavRange(122639, '2026-09-26' as IsoDate, '2026-10-10' as IsoDate);
    expect(requests[0]?.url).toBe(`${API_BASE_URL}/mf/122639?startDate=2026-09-26&endDate=2026-10-10`);
    expect(range.points.length).toBeGreaterThan(0);
  });

  it('returns no points, not an error, when a real scheme has no NAV in the window', async () => {
    serve(() =>
      reply(200, {
        meta: { scheme_code: 100121, scheme_name: 'HDFC Balanced Fund - Dividend Option' },
        data: [],
        status: 'SUCCESS',
      }),
    );
    const range = await fetchNavRange(100121, '2026-09-26' as IsoDate, '2026-10-10' as IsoDate);
    expect(range.points).toEqual([]);
  });
});
