import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Refetches stale, active queries whose key starts with `keyPrefix` when a screen
 * regains focus (for example, returning to the Watchlist tab). The first focus is
 * skipped, because mounting already fetched.
 */
export function useRefreshOnFocus(keyPrefix: 'nav-latest' | 'nav-history'): void {
  const queryClient = useQueryClient();
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void queryClient.refetchQueries({ queryKey: [keyPrefix], stale: true, type: 'active' });
    }, [queryClient, keyPrefix]),
  );
}
