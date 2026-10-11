import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PREFERENCES_STORAGE_KEY, RECENTLY_VIEWED_MAX, usePreferencesStore } from '../preferencesStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  usePreferencesStore.setState({ hideAmounts: false, recentlyViewed: [], sample: null });
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

  it('keeps the sample record across a reload, and drops a corrupt one', async () => {
    usePreferencesStore.getState().setSample({ lotIds: ['a', 'b'], watchCodes: [100121] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ state: { sample: { lotIds: ['a', 'b'], watchCodes: [100121] } } });
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().sample).toEqual({ lotIds: ['a', 'b'], watchCodes: [100121] });

    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, state: { sample: { lotIds: 'x' } } }));
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().sample).toBeNull();
  });
});
