import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** Connectivity as TanStack Query sees it (wired to NetInfo in queryClient.ts). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}
