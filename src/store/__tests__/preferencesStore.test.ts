import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PREFERENCES_STORAGE_KEY, RECENTLY_VIEWED_MAX, usePreferencesStore } from '../preferencesStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  usePreferencesStore.setState({ hideAmounts: false, recentlyViewed: [] });
  await AsyncStorage.clear();
});

describe('preferences store', () => {
  it('toggles hiding amounts', () => {
    usePreferencesStore.getState().toggleHideAmounts();
    expect(usePreferencesStore.getState().hideAmounts).toBe(true);
    usePreferencesStore.getState().toggleHideAmounts();
    expect(usePreferencesStore.getState().hideAmounts).toBe(false);
  });

  it('keeps recently viewed funds newest first, without duplicates, up to the limit', () => {
    const { markViewed } = usePreferencesStore.getState();
    for (let code = 1; code <= RECENTLY_VIEWED_MAX + 2; code++) markViewed({ schemeCode: code, schemeName: `Fund ${code}` });
    markViewed({ schemeCode: 5, schemeName: 'Fund 5' });
    const codes = usePreferencesStore.getState().recentlyViewed.map((item) => item.schemeCode);
    expect(codes[0]).toBe(5);
    expect(codes).toHaveLength(RECENTLY_VIEWED_MAX);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('drops corrupt saved entries on rehydrate', async () => {
    await AsyncStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { hideAmounts: 'yes', recentlyViewed: [{ schemeCode: 122639, schemeName: 'PPFAS' }, { schemeCode: -1 }, null] },
      }),
    );
    await usePreferencesStore.persist.rehydrate();
    const state = usePreferencesStore.getState();
    expect(state.hideAmounts).toBe(false);
    expect(state.recentlyViewed).toEqual([{ schemeCode: 122639, schemeName: 'PPFAS' }]);
  });
});
