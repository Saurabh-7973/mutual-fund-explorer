import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AppliedNav } from '@/domain/types';

import {
  EMPTY_PORTFOLIO,
  PORTFOLIO_STORAGE_KEY,
  PORTFOLIO_VERSION,
  addLot,
  addWatch,
  removeLot,
  removeWatch,
  resolveLot,
  restoreWatch,
  sanitizePortfolio,
  type HoldingLot,
  type PortfolioData,
  type WatchItem,
} from './portfolioSchema';

/**
 * The user's own data (watchlist and holding lots), persisted to AsyncStorage.
 * The rules live in portfolioSchema.ts as pure, unit-tested functions; this file
 * only wires them to Zustand.
 *
 * Select narrowly: `usePortfolioStore((s) => s.watchlist)`. A selector that builds a
 * new array or object on every call must be wrapped in `useShallow`, or Zustand 5
 * re-renders in a loop.
 */

export interface PortfolioState extends PortfolioData {
  /** True once saved data has been read, or reading failed. Screens show skeletons until then. */
  hydrated: boolean;
  watch: (scheme: { schemeCode: number; schemeName: string }) => void;
  /** Removes a scheme and returns what Undo needs, or null when it wasn't watched. */
  unwatch: (schemeCode: number) => { item: WatchItem; index: number } | null;
  undoUnwatch: (item: WatchItem, index: number) => void;
  addLot: (lot: HoldingLot) => void;
  removeLot: (id: string) => void;
  /** Prices an "Awaiting NAV" lot once its NAV is published. */
  resolveLot: (id: string, applied: AppliedNav) => void;
  /** Replaces everything with restored data (validated again here, whatever the caller did). */
  replaceAll: (data: PortfolioData) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      ...EMPTY_PORTFOLIO,
      hydrated: false,
      watch: (scheme) => set((state) => addWatch(state, { ...scheme, addedAt: new Date().toISOString() })),
      unwatch: (schemeCode) => {
        const { watchlist } = get();
        const index = watchlist.findIndex((item) => item.schemeCode === schemeCode);
        const item = watchlist[index];
        if (item === undefined) return null;
        set((state) => removeWatch(state, schemeCode));
        return { item, index };
      },
      undoUnwatch: (item, index) => set((state) => restoreWatch(state, item, index)),
      addLot: (lot) => set((state) => addLot(state, lot)),
      removeLot: (id) => set((state) => removeLot(state, id)),
      resolveLot: (id, applied) => set((state) => resolveLot(state, id, applied)),
      replaceAll: (data) => set(sanitizePortfolio(data)),
    }),
    {
      name: PORTFOLIO_STORAGE_KEY,
      version: PORTFOLIO_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      // Only the data is saved; `hydrated` and the actions are rebuilt on launch.
      partialize: (state): PortfolioData => ({ watchlist: state.watchlist, lots: state.lots }),
      // Runs only when the saved version differs. A future version bump transforms old data here.
      migrate: (persisted) => sanitizePortfolio(persisted),
      // Every load is validated: corrupt rows are dropped instead of crashing the app.
      merge: (persisted, current) => ({ ...current, ...sanitizePortfolio(persisted) }),
      onRehydrateStorage: () => (_state, error) => {
        if (error !== undefined) console.warn('[portfolio] could not read saved data', error);
        // Set even on failure, so the UI never waits forever.
        usePortfolioStore.setState({ hydrated: true });
      },
    },
  ),
);
