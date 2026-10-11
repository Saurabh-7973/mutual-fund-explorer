import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { IsoDate } from '../../domain/types';
import { PORTFOLIO_STORAGE_KEY, type HoldingLot } from '../portfolioSchema';
import { usePortfolioStore } from '../portfolioStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const lot = (id: string, units = '125.432'): HoldingLot => ({
  id,
  schemeCode: 122639,
  schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
  units,
  purchaseDate: '2024-03-31' as IsoDate,
  applied: { navDate: '2024-03-31' as IsoDate, nav: '74.86850' },
  createdAt: '2026-10-10T12:00:00.000Z',
});

/** Waits for the persist middleware's async write to land in storage. */
async function savedJson(): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const raw = await AsyncStorage.getItem(PORTFOLIO_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(async () => {
  usePortfolioStore.setState({ watchlist: [], lots: [] });
  await AsyncStorage.clear();
});

describe('portfolio store', () => {
  it('unwatch returns the item and its index, and undo restores the order', () => {
    const { watch } = usePortfolioStore.getState();
    watch({ schemeCode: 1, schemeName: 'A' });
    watch({ schemeCode: 2, schemeName: 'B' });
    watch({ schemeCode: 3, schemeName: 'C' });
    const before = usePortfolioStore.getState().watchlist.map((item) => item.schemeCode);

    const removed = usePortfolioStore.getState().unwatch(before[1] ?? 0);
    expect(removed?.index).toBe(1);
    expect(usePortfolioStore.getState().watchlist).toHaveLength(2);
    expect(usePortfolioStore.getState().unwatch(999)).toBeNull();

    if (removed === null) throw new Error('expected a removal');
    usePortfolioStore.getState().undoUnwatch(removed.item, removed.index);
    expect(usePortfolioStore.getState().watchlist.map((item) => item.schemeCode)).toEqual(before);
  });

  it('adds and removes lots', () => {
    usePortfolioStore.getState().addLot(lot('a'));
    usePortfolioStore.getState().addLot(lot('b'));
    expect(usePortfolioStore.getState().lots.map((item) => item.id)).toEqual(['a', 'b']);
    usePortfolioStore.getState().removeLot('a');
    expect(usePortfolioStore.getState().lots.map((item) => item.id)).toEqual(['b']);
  });

  it('saves only the data, as versioned JSON', async () => {
    usePortfolioStore.getState().watch({ schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund' });
    usePortfolioStore.getState().addLot(lot('a'));

    const saved = (await savedJson()) as { version: number; state: Record<string, unknown> };
    expect(saved.version).toBe(1);
    expect(Object.keys(saved.state).sort()).toEqual(['lots', 'watchlist']);
    expect(saved.state).not.toHaveProperty('hydrated');
  });

  it('replaces everything on restore, validating what it is given', () => {
    usePortfolioStore.getState().addLot(lot('old'));
    usePortfolioStore.getState().replaceAll({ watchlist: [], lots: [lot('new'), lot('bad', 'abc')] });
    expect(usePortfolioStore.getState().lots.map((item) => item.id)).toEqual(['new']);
  });

  it('drops corrupt saved rows on rehydrate and still marks itself hydrated', async () => {
    usePortfolioStore.setState({ hydrated: false });
    await AsyncStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { watchlist: [], lots: [lot('good'), lot('bad', 'abc')] } }),
    );

    await usePortfolioStore.persist.rehydrate();

    const state = usePortfolioStore.getState();
    expect(state.lots.map((item) => item.id)).toEqual(['good']);
    expect(state.hydrated).toBe(true);
  });

  it('takes out only what the sample added, keeping what the user saved', async () => {
    const { addLot, watch, addMany, removeItems } = usePortfolioStore.getState();
    addLot(lot('mine'));
    watch({ schemeCode: 122639, schemeName: 'PPFAS' });
    addMany([lot('sample-1'), lot('sample-2')], [
      { schemeCode: 122639, schemeName: 'PPFAS', addedAt: '2026-10-11T00:00:00.000Z' },
      { schemeCode: 100121, schemeName: 'HDFC Balanced', addedAt: '2026-10-11T00:00:00.000Z' },
    ]);
    // 122639 was already watched, so the sample didn't add it and doesn't record it.
    removeItems({ lotIds: ['sample-1', 'sample-2'], watchCodes: [100121] });
    const state = usePortfolioStore.getState();
    expect(state.lots.map((item) => item.id)).toEqual(['mine']);
    expect(state.watchlist.map((item) => item.schemeCode)).toEqual([122639]);
    expect(await savedJson()).toMatchObject({ state: { lots: [{ id: 'mine' }] } });
  });
});
