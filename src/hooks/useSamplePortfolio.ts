import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { todayInIndia } from '@/domain/dates';
import { buildSamplePortfolio, SAMPLE_FUNDS, SAMPLE_WATCHLIST, type SampleSeries } from '@/domain/sample';
import { latestNavQuery, navHistoryQuery } from '@/query/hooks';
import { hasAnyOf, newLotId, type HoldingLot, type WatchItem } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';

export type SampleStatus = { state: 'idle' } | { state: 'loading' } | { state: 'error'; error: unknown };

/**
 * Loads the sample portfolio (real NAVs, priced by the domain rules) and clears it again.
 * Only fetching and saving happen here; the pricing is `buildSamplePortfolio`. What was
 * added is recorded before it is saved, so Clear never touches anything the user added.
 */
export function useSamplePortfolio() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SampleStatus>({ state: 'idle' });
  const sample = usePreferencesStore((s) => s.sample);
  const setSample = usePreferencesStore((s) => s.setSample);
  const addMany = usePortfolioStore((s) => s.addMany);
  const removeItems = usePortfolioStore((s) => s.removeItems);
  const saved = usePortfolioStore(useShallow((s) => ({ watchlist: s.watchlist, lots: s.lots })));
  const active = sample !== null && hasAnyOf(saved, sample);

  const load = useCallback(async () => {
    setStatus({ state: 'loading' });
    try {
      const series = new Map<number, SampleSeries>();
      await Promise.all(
        SAMPLE_FUNDS.map(async (fund) => {
          const [history, latest] = await Promise.all([
            queryClient.fetchQuery(navHistoryQuery(fund.schemeCode)),
            queryClient.fetchQuery(latestNavQuery(fund.schemeCode)),
          ]);
          series.set(fund.schemeCode, { points: history.points, latest: latest.point });
        }),
      );
      const { purchases, missing } = buildSamplePortfolio(series, todayInIndia());
      if (missing.length > 0) throw new Error(`No NAVs for ${missing.join(', ')}`);

      const createdAt = new Date().toISOString();
      const lots: HoldingLot[] = purchases.map((item) => ({ ...item, id: newLotId(), createdAt }));
      const { watchlist } = usePortfolioStore.getState();
      // Funds the user already watches stay theirs: Clear must not remove them.
      const watch: WatchItem[] = SAMPLE_WATCHLIST.filter(
        (fund) => !watchlist.some((item) => item.schemeCode === fund.schemeCode),
      ).map((fund) => ({ ...fund, addedAt: createdAt }));
      setSample({ lotIds: lots.map((lot) => lot.id), watchCodes: watch.map((item) => item.schemeCode) });
      // Each watched fund goes on top, so add them last-first to keep the sample's order.
      addMany(lots, [...watch].reverse());
      setStatus({ state: 'idle' });
      return true;
    } catch (error) {
      setStatus({ state: 'error', error });
      return false;
    }
  }, [addMany, queryClient, setSample]);

  const clear = useCallback(() => {
    if (sample !== null) removeItems(sample);
    setSample(null);
  }, [removeItems, sample, setSample]);

  return { status, active, load, clear };
}
