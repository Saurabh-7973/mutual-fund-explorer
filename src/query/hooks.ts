import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchLatestNav, fetchNavHistory, fetchNavRange, searchSchemes } from '@/api/client';
import { addDays, todayInIndia } from '@/domain/dates';
import { dayChange, mergeLatest, type NavChange } from '@/domain/nav';
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
  // Under 'nav-latest' on purpose: persisted with the latest NAV, and refreshed by the same refetches.
  recent: (schemeCode: number) => ['nav-latest', schemeCode, 'recent'] as const,
};

/** Two weeks covers the longest run of market holidays (Diwali and weekends) between two NAVs. */
export const RECENT_NAV_DAYS = 14;

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

/** The last two weeks of NAVs: enough for the day's change on a list row, a few hundred bytes. */
export function recentNavQuery(schemeCode: number) {
  return queryOptions({
    queryKey: queryKeys.recent(schemeCode),
    queryFn: ({ signal }) => {
      const today = todayInIndia();
      return fetchNavRange(schemeCode, addDays(today, -RECENT_NAV_DAYS), today, signal);
    },
    staleTime: 15 * MINUTE_MS,
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

/**
 * The change from the previous NAV to the latest one, for list rows. Uses the recent
 * window plus the fresher /latest point (the history can lag by a day). Null while
 * loading, offline with nothing saved, or for a scheme with no NAV in the window.
 */
export function useDayChange(schemeCode: number, latestPoint: NavPoint | null | undefined): NavChange | null {
  const recent = useQuery(recentNavQuery(schemeCode));
  const points = recent.data?.points;
  return useMemo(
    () => (points === undefined ? null : dayChange(points, latestPoint ?? null)),
    [points, latestPoint],
  );
}
