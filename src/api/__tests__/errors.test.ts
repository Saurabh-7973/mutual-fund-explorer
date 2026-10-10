import { describe, expect, it } from '@jest/globals';

import { ApiError, describeError, isApiError, isRetryable, retryDelayMs, type ApiErrorKind } from '../errors';

describe('isRetryable', () => {
  it('retries only failures that a second attempt can fix', () => {
    expect(isRetryable(new ApiError('timeout', 'x'))).toBe(true);
    expect(isRetryable(new ApiError('network', 'x'))).toBe(true);
    expect(isRetryable(new ApiError('rate_limited', 'x', 429))).toBe(true);
    expect(isRetryable(new ApiError('http', 'x', 503))).toBe(true);
    expect(isRetryable(new ApiError('http', 'x', 400))).toBe(false);
    expect(isRetryable(new ApiError('not_found', 'x', 404))).toBe(false);
    expect(isRetryable(new ApiError('bad_data', 'x'))).toBe(false);
    expect(isRetryable(new Error('plain error'))).toBe(false);
  });
});

describe('retryDelayMs', () => {
  it('backs off 1 s, 2 s, 4 s, capped at 8 s, and waits longer after a 429', () => {
    const network = new ApiError('network', 'x');
    expect([0, 1, 2, 3, 4].map((attempt) => retryDelayMs(attempt, network))).toEqual([1000, 2000, 4000, 8000, 8000]);
    expect(retryDelayMs(0, new ApiError('rate_limited', 'x', 429))).toBe(5000);
    expect(retryDelayMs(1, new ApiError('rate_limited', 'x', 429))).toBe(10_000);
  });
});

describe('describeError', () => {
  it('says "offline" first when the device has no connection', () => {
    expect(describeError(new ApiError('timeout', 'x'), false).title).toBe('You’re offline');
  });

  it('has copy for every kind and never shows the internal message', () => {
    const kinds: ApiErrorKind[] = ['timeout', 'network', 'rate_limited', 'http', 'not_found', 'bad_data'];
    for (const kind of kinds) {
      const copy = describeError(new ApiError(kind, 'internal detail', kind === 'http' ? 502 : null));
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.detail.length).toBeGreaterThan(0);
      expect(`${copy.title} ${copy.detail}`).not.toContain('internal detail');
    }
    expect(describeError(new ApiError('http', 'x', 502)).title).toContain('HTTP 502');
    expect(describeError(new Error('boom')).title).toBe('Something unexpected happened');
  });

  it('recognises its own errors only', () => {
    expect(isApiError(new ApiError('network', 'x'))).toBe(true);
    expect(isApiError({ kind: 'network' })).toBe(false);
  });
});
