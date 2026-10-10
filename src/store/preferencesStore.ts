import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Display preferences, kept apart from the portfolio so a corrupt preference can never
 * touch holdings. Persisted to AsyncStorage; every field is JSON-safe.
 */

export const PREFERENCES_STORAGE_KEY = 'mfx.preferences';
export const RECENTLY_VIEWED_MAX = 6;

export interface RecentFund {
  schemeCode: number;
  schemeName: string;
}

export interface PreferencesState {
  /** Hide rupee amounts of the user's own money (percentages stay visible). */
  hideAmounts: boolean;
  /** Funds opened most recently, newest first. */
  recentlyViewed: RecentFund[];
  toggleHideAmounts: () => void;
  markViewed: (fund: RecentFund) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      recentlyViewed: [],
      toggleHideAmounts: () => set((state) => ({ hideAmounts: !state.hideAmounts })),
      markViewed: (fund) =>
        set((state) => {
          if (state.recentlyViewed[0]?.schemeCode === fund.schemeCode && state.recentlyViewed[0].schemeName === fund.schemeName) {
            return state;
          }
          const rest = state.recentlyViewed.filter((item) => item.schemeCode !== fund.schemeCode);
          return { recentlyViewed: [fund, ...rest].slice(0, RECENTLY_VIEWED_MAX) };
        }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hideAmounts: state.hideAmounts, recentlyViewed: state.recentlyViewed }),
      // Validate what was saved: anything unexpected falls back to the defaults.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PreferencesState>;
        const recent = Array.isArray(saved.recentlyViewed)
          ? saved.recentlyViewed
              .filter(
                (item): item is RecentFund =>
                  typeof item === 'object' &&
                  item !== null &&
                  Number.isInteger(item.schemeCode) &&
                  item.schemeCode > 0 &&
                  typeof item.schemeName === 'string',
              )
              .slice(0, RECENTLY_VIEWED_MAX)
          : [];
        return { ...current, hideAmounts: saved.hideAmounts === true, recentlyViewed: recent };
      },
    },
  ),
);
