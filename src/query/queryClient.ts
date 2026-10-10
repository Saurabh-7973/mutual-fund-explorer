import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, defaultShouldDehydrateQuery, focusManager, onlineManager, type Query } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { isRetryable, retryDelayMs } from '@/api/errors';

/**
 * Server state: one QueryClient for the app.
 * Retries, caching and refetch rules live here so screens never hand-roll them.
 */

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;
/** Latest-NAV answers stay on the device this long, so the watchlist renders offline with its "as of" dates. */
export const PERSIST_MAX_AGE_MS = 7 * DAY_MS;
/** Change this to discard every persisted query after a change to cached data shapes. */
export const PERSIST_BUSTER = 'mfx-cache-1';
const PERSIST_KEY = 'mfx.query-cache';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Two retries, and only for failures a retry can fix: timeouts, network drops, 429 and 5xx.
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      retryDelay: (attempt, error) => retryDelayMs(attempt, error),
      staleTime: 5 * MINUTE_MS,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  throttleTime: 1_000,
});

/**
 * Only successful /latest answers are persisted. Full histories are refetched:
 * they can exceed Android AsyncStorage's per-entry limit (about 2 MB).
 */
export function shouldPersistQuery(query: Query): boolean {
  return query.queryKey[0] === 'nav-latest' && defaultShouldDehydrateQuery(query);
}

let wired = false;

/**
 * Connects TanStack Query to React Native: NetInfo drives "online", AppState drives "focus".
 * Without this, queries never refetch on reconnect or when the app returns to the foreground.
 */
export function wireQueryEnvironment(): () => void {
  if (wired) return () => undefined;
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // isConnected is null while unknown; treat unknown as online so queries don't pause at launch.
      setOnline(state.isConnected !== false);
    }),
  );

  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });

  return () => {
    subscription.remove();
    wired = false;
  };
}
