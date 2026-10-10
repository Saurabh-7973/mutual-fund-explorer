import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { todayInIndia } from '@/domain/dates';
import { resolvePurchaseNavWithLatest } from '@/domain/nav';
import { latestNavQuery, navHistoryQuery } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';

/**
 * Prices "Awaiting NAV" lots as soon as their NAV is published.
 * Mounted once, inside the providers, so it works whichever screen is open.
 * It loads histories only for schemes that have a pending lot.
 */
export function usePendingLotResolver(): void {
  const hydrated = usePortfolioStore((state) => state.hydrated);
  const lots = usePortfolioStore((state) => state.lots);
  const resolveLot = usePortfolioStore((state) => state.resolveLot);

  const pendingCodes = useMemo(
    () => [...new Set(lots.filter((lot) => lot.applied === null).map((lot) => lot.schemeCode))],
    [lots],
  );
  const codes = hydrated ? pendingCodes : [];
  const histories = useQueries({ queries: codes.map((code) => navHistoryQuery(code)) });
  const latests = useQueries({ queries: codes.map((code) => latestNavQuery(code)) });

  // Changes whenever any of those queries receives data; stands in for the result arrays below.
  const dataVersion = [...histories, ...latests].map((result) => result.dataUpdatedAt).join(',');

  useEffect(() => {
    if (!hydrated) return;
    const today = todayInIndia();
    codes.forEach((code, i) => {
      const history = histories[i]?.data;
      if (history === undefined) return;
      const latest = latests[i]?.data?.point ?? null;
      for (const lot of lots) {
        if (lot.schemeCode !== code || lot.applied !== null) continue;
        const resolution = resolvePurchaseNavWithLatest(history.points, latest, lot.purchaseDate, today);
        if (resolution.kind === 'matched') {
          resolveLot(lot.id, { navDate: resolution.point.date, nav: resolution.point.nav });
        }
      }
    });
    // `dataVersion` represents `histories` and `latests`, which are new arrays on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, dataVersion, lots, resolveLot]);
}
