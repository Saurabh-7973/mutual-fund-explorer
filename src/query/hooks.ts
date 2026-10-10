import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchLatestNav, fetchNavHistory, searchSchemes } from '@/api/client';
import { mergeLatest } from '@/domain/nav';
import { isSearchable, normalizeQuery } from '@/domain/search';
import type { NavPoint } from '@/domain/types';

import { DAY_MS, MINUTE_MS, PERSIST_MAX_AGE_MS } from './queryClient';

/**
 * Query keys and options in one place. Screens use these hooks or options and
 * never call the API client directly.
 *
 * The first key segment matters: 'nav-latest' is the only one persisted to disk.
 */
export const queryKeys = {
  search: (normalized: string) => ['search', normalized] as const,
  history: (schemeCode: number) => ['nav-history', schemeCode] as const,
  latest: (schemeCode: number) => ['nav-latest', schemeCode] as const,
};

/** The light /latest endpoint: watchlist rows and holding values. */
export function latestNavQuery(schemeCode: number) {
  return queryOptions({
    queryKey: queryKeys.latest(schemeCode),
    queryFn: ({ signal }) => fetchLatestNav(schemeCode, signal),
    staleTime: 15 * MINUTE_MS,
    // Must be at least the persister's maxAge, or the offline copy is garbage-collected before it is saved.
    gcTime: PERSIST_MAX_AGE_MS,
  });
}

/** The full history (thousands of rows): fund screen, NAV list, purchase pricing. Memory only. */
export function navHistoryQuery(schemeCode: number) {
  return queryOptions({
    queryKey: queryKeys.history(schemeCode),
    queryFn: ({ signal }) => fetchNavHistory(schemeCode, signal),
    staleTime: 60 * MINUTE_MS,
    gcTime: 10 * MINUTE_MS,
  });
}

/**
 * Scheme search. Returns `enabled: false` below the minimum length: in that case
 * `query.data` can still hold the previous results (keepPreviousData), so the
 * screen must check `enabled` before showing results.
 */
export function useSchemeSearch(rawQuery: string) {
  const normalized = normalizeQuery(rawQuery);
  const enabled = isSearchable(normalized);
  const query = useQuery({
    queryKey: queryKeys.search(normalized),
    queryFn: ({ signal }) => searchSchemes(normalized, signal),
    enabled,
    staleTime: DAY_MS,
    placeholderData: keepPreviousData,
  });
  return { query, normalized, enabled };
}

export function useLatestNav(schemeCode: number) {
  return useQuery(latestNavQuery(schemeCode));
}

export function useNavHistory(schemeCode: number) {
  return useQuery(navHistoryQuery(schemeCode));
}

/**
 * History plus the fresher /latest point (the history endpoint can lag by a day).
 * `points` is null until the history has loaded; it is memoised, so charts and
 * lists don't rebuild on unrelated renders.
 */
export function useFundSeries(schemeCode: number) {
  const history = useNavHistory(schemeCode);
  const latest = useLatestNav(schemeCode);
  const historyPoints = history.data?.points;
  const latestPoint = latest.data?.point ?? null;
  const points = useMemo<NavPoint[] | null>(
    () => (historyPoints === undefined ? null : mergeLatest(historyPoints, latestPoint)),
    [historyPoints, latestPoint],
  );
  return { history, latest, points };
}
