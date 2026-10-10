import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, type ReactNode } from 'react';

import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE_MS,
  queryClient,
  queryPersister,
  shouldPersistQuery,
  wireQueryEnvironment,
} from './queryClient';

const persistOptions = {
  persister: queryPersister,
  maxAge: PERSIST_MAX_AGE_MS,
  buster: PERSIST_BUSTER,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};

/** Provides the QueryClient and restores the persisted /latest cache before queries run. */
export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => wireQueryEnvironment(), []);
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
