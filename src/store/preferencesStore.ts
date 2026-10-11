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

/** What the sample portfolio added, so Clear takes out only that. */
export interface SampleRecord {
  lotIds: string[];
  watchCodes: number[];
}

export interface PreferencesState {
  /** Hide rupee amounts of the user's own money (percentages stay visible). */
  hideAmounts: boolean;
  /** Funds opened most recently, newest first. */
  recentlyViewed: RecentFund[];
  /** Set while the sample portfolio is loaded; null otherwise. */
  sample: SampleRecord | null;
  setSample: (sample: SampleRecord | null) => void;
  toggleHideAmounts: () => void;
  markViewed: (fund: RecentFund) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      recentlyViewed: [],
      sample: null,
      setSample: (sample) => set({ sample }),
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
      partialize: (state) => ({ hideAmounts: state.hideAmounts, recentlyViewed: state.recentlyViewed, sample: state.sample }),
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
        return { ...current, hideAmounts: saved.hideAmounts === true, recentlyViewed: recent, sample: sanitizeSample(saved.sample) };
      },
    },
  ),
);

function sanitizeSample(value: unknown): SampleRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const { lotIds, watchCodes } = value as Partial<Record<keyof SampleRecord, unknown>>;
  if (!Array.isArray(lotIds) || !Array.isArray(watchCodes)) return null;
  return {
    lotIds: lotIds.filter((id): id is string => typeof id === 'string'),
    watchCodes: watchCodes.filter((code): code is number => Number.isInteger(code) && code > 0),
  };
}
