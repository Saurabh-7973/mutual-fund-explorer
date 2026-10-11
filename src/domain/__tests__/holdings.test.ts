import { describe, expect, it } from '@jest/globals';

import { VALUE_SCALE } from '../decimal';
import { formatInr } from '../format';
import {
  allocation,
  annualisedReturn,
  holdingsByFund,
  portfolioDayGain,
  purchaseTimeline,
  sortHoldings,
  sortLots,
  allocationByAssetClass,
  type EvaluatedLot,
} from '../holdings';
import { assetClassOf } from '../assetClass';
import { navChange } from '../nav';
import type { IsoDate } from '../types';
import { evaluateLot, parseAmount } from '../valuation';

const lot = (id: string, schemeName: string, purchaseDate: string) => ({
  id,
  schemeName,
  purchaseDate: purchaseDate as IsoDate,
});

describe('sortLots', () => {
  it('groups by fund title, then plan, then purchase date', () => {
    const sorted = sortLots([
      lot('a', 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth', '2024-01-01'),
      lot('b', 'HDFC Balanced Fund - Dividend Option', '2018-01-01'),
      lot('c', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', '2025-06-01'),
      lot('d', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', '2024-03-31'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('ignores case and leaves the input untouched', () => {
    const input = [lot('x', 'zeta fund', '2024-01-01'), lot('y', 'Alpha Fund', '2024-01-01')];
    expect(sortLots(input).map((item) => item.id)).toEqual(['y', 'x']);
    expect(input.map((item) => item.id)).toEqual(['x', 'y']);
  });
});

const PPFAS = 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth';
const LATEST = { date: '2026-10-09' as IsoDate, nav: '88.9258', value: 88.9258 };

function evaluated(
  schemeCode: number,
  schemeName: string,
  units: string,
  navDate: string | null,
  nav = '74.8685',
): EvaluatedLot {
  const applied = navDate === null ? null : { navDate: navDate as IsoDate, nav };
  return { schemeCode, schemeName, units, applied, status: evaluateLot({ units, applied }, LATEST) };
}

describe('holdingsByFund', () => {
  it('adds up each fund exactly and counts pending lots apart', () => {
    const funds = holdingsByFund([
      evaluated(122639, PPFAS, '125.432', '2024-03-31'),
      evaluated(122639, PPFAS, '10', null),
    ]);
    expect(funds).toHaveLength(1);
    const fund = funds[0];
    expect(fund?.lotCount).toBe(2);
    expect(fund?.valuedCount).toBe(1);
    expect(fund?.pendingCount).toBe(1);
    expect(fund?.units).toBe(1_354_320n); // 135.432 units at 4 decimals, priced or not
    expect(formatInr(fund?.invested ?? 0n, VALUE_SCALE)).toBe('₹9,390.91');
    expect(formatInr(fund?.current ?? 0n, VALUE_SCALE)).toBe('₹11,154.14');
    expect(fund?.xirrPercent).toBeCloseTo(7.05, 2);
  });

  it('orders funds by current value, largest first', () => {
    const funds = holdingsByFund([
      evaluated(1, 'Small Fund - Direct Plan - Growth', '1', '2024-03-31'),
      evaluated(2, 'Big Fund - Direct Plan - Growth', '100', '2024-03-31'),
    ]);
    expect(funds.map((fund) => fund.schemeCode)).toEqual([2, 1]);
  });
});

describe('annualisedReturn', () => {
  it('is null until the oldest valued purchase is a year old', () => {
    expect(annualisedReturn([evaluated(1, PPFAS, '10', '2026-03-01')])).toBeNull();
    expect(annualisedReturn([evaluated(1, PPFAS, '10', null)])).toBeNull();
    expect(annualisedReturn([evaluated(1, PPFAS, '10', '2025-03-01')])).not.toBeNull();
  });
});

describe('allocation', () => {
  it('gives each fund its share and folds the tail into "other funds"', () => {
    const funds = holdingsByFund([
      evaluated(1, 'A Fund - Direct Plan - Growth', '40', '2024-03-31'),
      evaluated(2, 'B Fund - Direct Plan - Growth', '30', '2024-03-31'),
      evaluated(3, 'C Fund - Direct Plan - Growth', '20', '2024-03-31'),
      evaluated(4, 'D Fund - Direct Plan - Growth', '6', '2024-03-31'),
      evaluated(5, 'E Fund - Direct Plan - Growth', '4', '2024-03-31'),
    ]);
    const slices = allocation(funds, 4);
    expect(slices.map((slice) => slice.label)).toEqual(['A Fund', 'B Fund', 'C Fund', '2 other funds']);
    expect(slices.map((slice) => slice.shareHundredths)).toEqual([4000n, 3000n, 2000n, 1000n]);
  });

  it('is empty when nothing is valued', () => {
    expect(allocation(holdingsByFund([evaluated(1, PPFAS, '10', null)]))).toEqual([]);
  });
});

describe('portfolioDayGain', () => {
  const prev = { date: '2026-10-08' as IsoDate, nav: '87.6555', value: 87.6555 };
  const change = navChange(prev, LATEST);

  it('multiplies valued units by the NAV move and compares with yesterday', () => {
    const funds = holdingsByFund([
      evaluated(122639, PPFAS, '125.432', '2024-03-31'),
      evaluated(122639, PPFAS, '10', null),
    ]);
    const gain = portfolioDayGain(funds, new Map([[122639, change]]));
    // 125.432 × ₹1.2703 = ₹159.34 (pending units don't count)
    expect(formatInr(gain?.amount ?? 0n, VALUE_SCALE, 'always')).toBe('+₹159.34');
    expect(gain?.pctHundredths).toBe(145n);
  });

  it('skips a fund whose move ends on a different NAV than its value', () => {
    const funds = holdingsByFund([evaluated(122639, PPFAS, '125.432', '2024-03-31')]);
    const stale = navChange({ ...prev, date: '2026-10-07' as IsoDate }, prev);
    expect(portfolioDayGain(funds, new Map([[122639, stale]]))).toBeNull();
    expect(portfolioDayGain(funds, new Map())).toBeNull();
  });
});

describe('purchaseTimeline', () => {
  const lot = (id: string, units: string, date: string, nav: string | null) => ({
    id,
    units,
    purchaseDate: date as IsoDate,
    applied: nav === null ? null : { navDate: date as IsoDate, nav },
  });

  it('uses the amount paid as the purchase cost and in the average, when saved', () => {
    const timeline = purchaseTimeline([{ ...lot('a', '100', '2024-01-10', '90.0000'), amount: '9100' }]);
    expect(timeline[0]?.invested).toBe(parseAmount('9100'));
    // ₹9,100 for 100 units: ₹91 a unit, at 8 decimals.
    expect(timeline[0]?.averageNavAfter).toBe(9_100_000_000n);
  });

  it('orders purchases by date and keeps a running average cost per unit', () => {
    const timeline = purchaseTimeline([
      lot('b', '50', '2025-01-10', '120.0000'),
      lot('a', '100', '2024-01-10', '90.0000'),
      lot('c', '5', '2026-10-10', null),
    ]);
    expect(timeline.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(timeline[0]?.averageNavAfter).toBe(9_000_000_000n); // ₹90 at 8 decimals
    // (100 × 90 + 50 × 120) / 150 = 100
    expect(timeline[1]?.averageNavAfter).toBe(10_000_000_000n);
    // An unpriced purchase is listed but doesn't move the average.
    expect(timeline[2]?.invested).toBeNull();
    expect(timeline[2]?.averageNavAfter).toBe(10_000_000_000n);
    expect(timeline[2]?.unitsAfter).toBe(1_500_000n);
  });
});

describe('sortHoldings', () => {
  const funds = holdingsByFund([
    evaluated(1, 'Small Winner Fund - Direct Plan - Growth', '1', '2024-03-31', '40.0000'),
    evaluated(2, 'Big Loser Fund - Direct Plan - Growth', '100', '2024-03-31', '120.0000'),
    evaluated(3, 'Waiting Fund - Direct Plan - Growth', '5', null),
  ]);

  it('orders by value or by return, either way, with unvalued funds last', () => {
    expect(sortHoldings(funds, 'value', 'desc').map((f) => f.schemeCode)).toEqual([2, 1, 3]);
    expect(sortHoldings(funds, 'value', 'asc').map((f) => f.schemeCode)).toEqual([1, 2, 3]);
    expect(sortHoldings(funds, 'returns', 'desc').map((f) => f.schemeCode)).toEqual([1, 2, 3]);
  });

  it('orders by name A to Z or Z to A, ignoring plan and option', () => {
    expect(sortHoldings(funds, 'name', 'asc').map((f) => f.schemeCode)).toEqual([2, 1, 3]);
    expect(sortHoldings(funds, 'name', 'desc').map((f) => f.schemeCode)).toEqual([3, 1, 2]);
  });

  it("orders by today's change, with funds whose change isn't loaded last", () => {
    const point = (date: string, nav: string) => ({ date: date as IsoDate, nav, value: Number(nav) });
    const changes = new Map([
      [1, navChange(point('2026-10-08', '40.0000'), point('2026-10-09', '39.8000'))],
      [2, navChange(point('2026-10-08', '120.0000'), point('2026-10-09', '121.0000'))],
    ]);
    expect(sortHoldings(funds, 'day', 'desc', changes).map((f) => f.schemeCode)).toEqual([2, 1, 3]);
    expect(sortHoldings(funds, 'day', 'asc', changes).map((f) => f.schemeCode)).toEqual([1, 2, 3]);
  });
});

describe('allocationByAssetClass', () => {
  it('sums funds into classes in the fixed order, with shares of the whole', () => {
    const funds = holdingsByFund([
      evaluated(1, 'Hybrid One - Direct Plan - Growth', '10', '2024-03-31'),
      evaluated(2, 'Equity One - Direct Plan - Growth', '20', '2024-03-31'),
      evaluated(3, 'Equity Two - Direct Plan - Growth', '10', '2024-03-31'),
    ]);
    const categories = new Map([
      [1, 'Hybrid Scheme - Aggressive Hybrid Fund'],
      [2, 'Equity Scheme - Large Cap Fund'],
      [3, 'Equity Scheme - Mid Cap Fund'],
    ]);
    const slices = allocationByAssetClass(funds, (f) =>
      assetClassOf(categories.get(f.schemeCode) ?? null, f.schemeName),
    );
    expect(slices.map((s) => [s.assetClass, s.fundCount, s.shareHundredths])).toEqual([
      ['Equity', 2, 7500n],
      ['Hybrid', 1, 2500n],
    ]);
  });
});
