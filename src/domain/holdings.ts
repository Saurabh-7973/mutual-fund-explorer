import { ASSET_CLASSES, type AssetClass } from './assetClass';
import { diffDays } from './dates';
import { NAV_SCALE, UNITS_SCALE, VALUE_SCALE, divRound, parseScaled, toNumber } from './decimal';
import { describeScheme } from './schemeName';
import type { NavChange } from './nav';
import type { AppliedNav, IsoDate } from './types';
import { lotInvested, type LotStatus } from './valuation';
import { xirrPercent, type CashFlow } from './xirr';

/**
 * Holdings list order: by fund title (A to Z, ignoring case), then plan/option
 * text, then purchase date (oldest first), so all lots of one fund sit together.
 */
export function sortLots<T extends { schemeName: string; purchaseDate: IsoDate }>(lots: readonly T[]): T[] {
  const keyed = lots.map((lot) => {
    const { title, variant } = describeScheme(lot.schemeName);
    return { lot, title: title.toLowerCase(), variant: variant.toLowerCase() };
  });
  keyed.sort((a, b) => {
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    if (a.variant !== b.variant) return a.variant < b.variant ? -1 : 1;
    if (a.lot.purchaseDate !== b.lot.purchaseDate) return a.lot.purchaseDate < b.lot.purchaseDate ? -1 : 1;
    return 0;
  });
  return keyed.map((entry) => entry.lot);
}

/** A saved purchase with its valuation, as the Holdings screen has it. */
export interface EvaluatedLot {
  schemeCode: number;
  schemeName: string;
  units: string;
  applied: AppliedNav | null;
  status: LotStatus;
}

/** One fund's purchases added up. Money stays exact (BigInt at VALUE_SCALE). */
export interface FundHolding {
  schemeCode: number;
  schemeName: string;
  lotCount: number;
  /** Lots that are valued; the money fields cover only these. */
  valuedCount: number;
  pendingCount: number;
  unavailableCount: number;
  /** All units held, priced or not, at UNITS_SCALE. */
  units: bigint;
  /** Units of the valued lots only: what the current value is made of. */
  valuedUnits: bigint;
  invested: bigint;
  current: bigint;
  gain: bigint;
  returnHundredths: bigint | null;
  /** Annualised (XIRR) only once the oldest valued purchase is a year old; null before that. */
  xirrPercent: number | null;
  latestDate: IsoDate | null;
}

const DAYS_PER_YEAR = 365;

/**
 * XIRR over valued lots, or null when nothing is valued or the oldest purchase is under
 * a year old: like single-lot CAGR, returns under a year are shown as absolute, not annualised.
 */
export function annualisedReturn(lots: readonly EvaluatedLot[]): number | null {
  const flows: CashFlow[] = [];
  let oldest: IsoDate | null = null;
  let newest: IsoDate | null = null;
  for (const lot of lots) {
    if (lot.status.status !== 'valued' || lot.applied === null) continue;
    const { invested, current, latestDate } = lot.status.valuation;
    flows.push({ date: lot.applied.navDate, amount: -toNumber(invested, VALUE_SCALE) });
    flows.push({ date: latestDate, amount: toNumber(current, VALUE_SCALE) });
    if (oldest === null || lot.applied.navDate < oldest) oldest = lot.applied.navDate;
    if (newest === null || latestDate > newest) newest = latestDate;
  }
  if (oldest === null || newest === null || diffDays(oldest, newest) < DAYS_PER_YEAR) return null;
  return xirrPercent(flows);
}

/** Lots grouped into one entry per fund, largest current value first. */
export function holdingsByFund(lots: readonly EvaluatedLot[]): FundHolding[] {
  const groups = new Map<number, EvaluatedLot[]>();
  for (const lot of lots) {
    const group = groups.get(lot.schemeCode);
    if (group) group.push(lot);
    else groups.set(lot.schemeCode, [lot]);
  }

  const funds: FundHolding[] = [];
  for (const [schemeCode, group] of groups) {
    let units = 0n;
    let valuedUnits = 0n;
    let invested = 0n;
    let current = 0n;
    let valuedCount = 0;
    let pendingCount = 0;
    let unavailableCount = 0;
    let latestDate: IsoDate | null = null;
    for (const lot of group) {
      units += parseScaled(lot.units, UNITS_SCALE) ?? 0n;
      if (lot.status.status === 'pending') pendingCount++;
      else if (lot.status.status === 'unavailable') unavailableCount++;
      else {
        valuedCount++;
        valuedUnits += lot.status.valuation.units;
        invested += lot.status.valuation.invested;
        current += lot.status.valuation.current;
        const date = lot.status.valuation.latestDate;
        if (latestDate === null || date > latestDate) latestDate = date;
      }
    }
    const gain = current - invested;
    funds.push({
      schemeCode,
      schemeName: group[0]?.schemeName ?? `Scheme ${schemeCode}`,
      lotCount: group.length,
      valuedCount,
      pendingCount,
      unavailableCount,
      units,
      valuedUnits,
      invested,
      current,
      gain,
      returnHundredths: invested > 0n ? divRound(gain * 10_000n, invested) : null,
      xirrPercent: annualisedReturn(group),
      latestDate,
    });
  }
  return funds.sort((a, b) => (a.current === b.current ? a.schemeCode - b.schemeCode : a.current > b.current ? -1 : 1));
}

export interface AllocationSlice {
  /** Null for the combined "Other funds" slice. */
  schemeCode: number | null;
  label: string;
  /** Share of the portfolio's current value, in hundredths of a percent. */
  shareHundredths: bigint;
}

/**
 * Each fund's share of the current value, largest first. Funds past `maxSlices - 1`
 * are combined into one "Other funds" slice so a small bar stays readable.
 */
export function allocation(funds: readonly FundHolding[], maxSlices = 4): AllocationSlice[] {
  const valued = funds.filter((fund) => fund.current > 0n);
  const total = valued.reduce((sum, fund) => sum + fund.current, 0n);
  if (total === 0n) return [];
  const share = (value: bigint) => divRound(value * 10_000n, total);
  const shown = valued.length <= maxSlices ? valued : valued.slice(0, maxSlices - 1);
  const slices: AllocationSlice[] = shown.map((fund) => ({
    schemeCode: fund.schemeCode,
    label: describeScheme(fund.schemeName).title,
    shareHundredths: share(fund.current),
  }));
  if (shown.length < valued.length) {
    const rest = valued.slice(shown.length).reduce((sum, fund) => sum + fund.current, 0n);
    slices.push({ schemeCode: null, label: `${valued.length - shown.length} other funds`, shareHundredths: share(rest) });
  }
  return slices;
}

export interface DayGain {
  /** Rupees at VALUE_SCALE. */
  amount: bigint;
  /** Against yesterday's value, in hundredths of a percent. */
  pctHundredths: bigint;
}

/**
 * Today's change in the portfolio: each fund's valued units times its latest NAV move.
 * A fund counts only when its move ends on the NAV its value uses, so the day's figure
 * and the current value always describe the same NAVs. Null when no fund qualifies.
 */
export function portfolioDayGain(
  funds: readonly FundHolding[],
  changes: ReadonlyMap<number, NavChange | null>,
): DayGain | null {
  let amount = 0n;
  let current = 0n;
  let counted = 0;
  for (const fund of funds) {
    const change = changes.get(fund.schemeCode);
    if (change === null || change === undefined || fund.valuedUnits === 0n || change.to.date !== fund.latestDate) continue;
    amount += fund.valuedUnits * change.diff;
    current += fund.current;
    counted++;
  }
  const before = current - amount;
  if (counted === 0 || before <= 0n) return null;
  return { amount, pctHundredths: divRound(amount * 10_000n, before) };
}

export interface TimelineEntry {
  id: string;
  purchaseDate: IsoDate;
  /** Null while the purchase awaits its NAV. */
  navDate: IsoDate | null;
  nav: string | null;
  /** This purchase's units, at UNITS_SCALE. */
  units: bigint;
  /** Rupees at VALUE_SCALE; null while awaiting a NAV. */
  invested: bigint | null;
  /** Units held after this purchase, priced ones only. */
  unitsAfter: bigint;
  /** Average cost per unit after this purchase, at NAV_SCALE; null until something is priced. */
  averageNavAfter: bigint | null;
}

/**
 * A fund's purchases in date order, each with the running average cost per unit, the way
 * a statement shows a holding's history. Purchases awaiting a NAV appear but don't move
 * the average.
 */
export function purchaseTimeline(
  lots: readonly { id: string; units: string; purchaseDate: IsoDate; applied: AppliedNav | null; amount?: string }[],
): TimelineEntry[] {
  const ordered = [...lots].sort((a, b) =>
    a.purchaseDate === b.purchaseDate ? a.id.localeCompare(b.id) : a.purchaseDate < b.purchaseDate ? -1 : 1,
  );
  let pricedUnits = 0n;
  let pricedCost = 0n;
  return ordered.map((lot) => {
    const units = parseScaled(lot.units, UNITS_SCALE) ?? 0n;
    const cost = units > 0n ? lotInvested(lot) : null;
    let invested: bigint | null = null;
    if (cost !== null) {
      invested = cost;
      pricedUnits += units;
      pricedCost += cost;
    }
    return {
      id: lot.id,
      purchaseDate: lot.purchaseDate,
      navDate: lot.applied?.navDate ?? null,
      nav: lot.applied?.nav ?? null,
      units,
      invested,
      unitsAfter: pricedUnits,
      // cost (VALUE_SCALE) / units (UNITS_SCALE) leaves NAV_SCALE.
      averageNavAfter: pricedUnits > 0n ? divRound(pricedCost, pricedUnits) : null,
    };
  });
}

export type HoldingSort = 'value' | 'returns' | 'xirr';
export type SortDirection = 'desc' | 'asc';

/**
 * Funds ordered by the figure the list is showing. Funds without that figure (nothing valued
 * yet, or XIRR under a year) go last either way, so the order never hides them in the middle.
 */
export function sortHoldings(funds: readonly FundHolding[], by: HoldingSort, direction: SortDirection): FundHolding[] {
  const key = (fund: FundHolding): number | null => {
    if (fund.valuedCount === 0) return null;
    if (by === 'value') return toNumber(fund.current, VALUE_SCALE);
    if (by === 'returns') return fund.returnHundredths === null ? null : Number(fund.returnHundredths);
    return fund.xirrPercent;
  };
  const sign = direction === 'desc' ? -1 : 1;
  return [...funds].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null || kb === null) return ka === kb ? a.schemeCode - b.schemeCode : ka === null ? 1 : -1;
    return ka === kb ? a.schemeCode - b.schemeCode : (ka - kb) * sign;
  });
}

export interface AssetClassSlice {
  assetClass: AssetClass;
  /** Rupees at VALUE_SCALE. */
  current: bigint;
  shareHundredths: bigint;
  fundCount: number;
}

/** Current value by asset class, in the fixed class order (so colours never move), empty classes left out. */
export function allocationByAssetClass(
  funds: readonly FundHolding[],
  classOf: (fund: FundHolding) => AssetClass,
): AssetClassSlice[] {
  const totals = new Map<AssetClass, { current: bigint; fundCount: number }>();
  let total = 0n;
  for (const fund of funds) {
    if (fund.current <= 0n) continue;
    const cls = classOf(fund);
    const entry = totals.get(cls) ?? { current: 0n, fundCount: 0 };
    entry.current += fund.current;
    entry.fundCount++;
    totals.set(cls, entry);
    total += fund.current;
  }
  if (total === 0n) return [];
  return ASSET_CLASSES.flatMap((assetClass) => {
    const entry = totals.get(assetClass);
    return entry === undefined
      ? []
      : [{ assetClass, current: entry.current, fundCount: entry.fundCount, shareHundredths: divRound(entry.current * 10_000n, total) }];
  });
}
