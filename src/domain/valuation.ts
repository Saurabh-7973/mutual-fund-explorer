import { NAV_SCALE, UNITS_SCALE, VALUE_SCALE, divRound, parseScaled, pow10 } from './decimal';
import { diffDays } from './dates';
import type { AppliedNav, IsoDate, NavPoint } from './types';

/**
 * Holding valuation for one lot (one purchase on one date).
 *
 *   invested = the rupees paid, when known (see `lotInvested`); else units × applied NAV
 *   current  = units × latest NAV
 *   gain     = current − invested
 *   return % = gain ÷ invested × 100            (always absolute)
 *   CAGR     = (current ÷ invested)^(365 ÷ days) − 1, shown only from 365 days
 *              (the same as latest NAV ÷ applied NAV when invested is units × NAV)
 *
 * For a single lot, CAGR equals XIRR, so no iterative solver is needed.
 * All rupee figures are exact BigInts at VALUE_SCALE; rounding happens at display.
 */

/** Rupees paid are saved in paise precision: "5000", "9390.91". */
export const AMOUNT_SCALE = 2;

/** A saved rupee amount at VALUE_SCALE, or null when it's missing or not a positive amount. */
export function parseAmount(amount: string | undefined): bigint | null {
  if (amount === undefined) return null;
  const paise = parseScaled(amount, AMOUNT_SCALE);
  return paise === null || paise <= 0n ? null : paise * pow10(VALUE_SCALE - AMOUNT_SCALE);
}

/**
 * What a purchase cost, at VALUE_SCALE. The rupees actually paid when the app knows them
 * (a SIP instalment, or an amount copied from the statement), as real apps and account
 * statements show it; otherwise units × the NAV applied. The two differ by a few paise
 * because units are rounded and stamp duty is taken before units are allotted.
 * Null while the purchase awaits its NAV.
 */
export function lotInvested(lot: { units: string; applied: AppliedNav | null; amount?: string }): bigint | null {
  if (lot.applied === null) return null;
  const paid = parseAmount(lot.amount);
  if (paid !== null) return paid;
  const units = parseScaled(lot.units, UNITS_SCALE);
  const nav = parseScaled(lot.applied.nav, NAV_SCALE);
  return units === null || nav === null ? null : units * nav;
}

export interface LotInput {
  units: string;
  /** Rupees paid, when known; otherwise invested is units × applied NAV. */
  amount?: string;
  appliedNav: string;
  appliedDate: IsoDate;
  latestNav: string;
  latestDate: IsoDate;
}

export interface LotValuation {
  /** Units at UNITS_SCALE. */
  units: bigint;
  /** Rupees at VALUE_SCALE. */
  invested: bigint;
  current: bigint;
  gain: bigint;
  /** Hundredths of a percent: 1234n = 12.34%. */
  returnHundredths: bigint;
  /** Annualised percent, only when held 365 days or more. */
  cagrPercent: number | null;
  heldDays: number;
  latestDate: IsoDate;
}

const DAYS_PER_YEAR = 365;

export function valueLot(input: LotInput): LotValuation | null {
  const units = parseScaled(input.units, UNITS_SCALE);
  const applied = parseScaled(input.appliedNav, NAV_SCALE);
  const latest = parseScaled(input.latestNav, NAV_SCALE);
  if (units === null || applied === null || latest === null) return null;
  if (units <= 0n || applied <= 0n || latest <= 0n) return null;

  const invested = parseAmount(input.amount) ?? units * applied;
  const current = units * latest;
  const gain = current - invested;
  const heldDays = Math.max(0, diffDays(input.appliedDate, input.latestDate));
  const ratio = Number(current) / Number(invested);
  const cagrPercent = heldDays >= DAYS_PER_YEAR ? (Math.pow(ratio, DAYS_PER_YEAR / heldDays) - 1) * 100 : null;

  return {
    units,
    invested,
    current,
    gain,
    returnHundredths: divRound(gain * 10_000n, invested),
    cagrPercent,
    heldDays,
    latestDate: input.latestDate,
  };
}

export type LotStatus =
  | { status: 'valued'; valuation: LotValuation }
  | { status: 'pending' }
  | { status: 'unavailable' };

/**
 * Values a saved lot against the latest NAV the app has loaded.
 *  - no applied NAV yet ("Awaiting NAV")          → pending
 *  - latest NAV not loaded, failed, or unusable    → unavailable (left out of totals)
 * A cached latest NAV can be older than the applied NAV (for example after a long
 * time offline); then the applied NAV is the newest price known, and the lot shows no gain.
 */
export function evaluateLot(
  lot: { units: string; applied: AppliedNav | null; amount?: string },
  latest: NavPoint | null | undefined,
): LotStatus {
  if (lot.applied === null) return { status: 'pending' };
  if (latest === null || latest === undefined) return { status: 'unavailable' };
  const newer = latest.date >= lot.applied.navDate;
  const valuation = valueLot({
    units: lot.units,
    ...(lot.amount !== undefined ? { amount: lot.amount } : {}),
    appliedNav: lot.applied.nav,
    appliedDate: lot.applied.navDate,
    latestNav: newer ? latest.nav : lot.applied.nav,
    latestDate: newer ? latest.date : lot.applied.navDate,
  });
  return valuation === null ? { status: 'unavailable' } : { status: 'valued', valuation };
}

export interface PortfolioTotals {
  invested: bigint;
  current: bigint;
  gain: bigint;
  /** Null when no lot could be valued. */
  returnHundredths: bigint | null;
  valuedCount: number;
  pendingCount: number;
  unavailableCount: number;
  /** Oldest and newest latest-NAV dates used, since funds publish on different days. */
  oldestNavDate: IsoDate | null;
  newestNavDate: IsoDate | null;
}

/** Sums exact values first and rounds nothing: a total can differ from the sum of rounded rows by a paisa. */
export function summarize(lots: readonly LotStatus[]): PortfolioTotals {
  let invested = 0n;
  let current = 0n;
  let valuedCount = 0;
  let pendingCount = 0;
  let unavailableCount = 0;
  let oldestNavDate: IsoDate | null = null;
  let newestNavDate: IsoDate | null = null;

  for (const lot of lots) {
    if (lot.status === 'pending') {
      pendingCount++;
    } else if (lot.status === 'unavailable') {
      unavailableCount++;
    } else {
      valuedCount++;
      invested += lot.valuation.invested;
      current += lot.valuation.current;
      const date = lot.valuation.latestDate;
      if (oldestNavDate === null || date < oldestNavDate) oldestNavDate = date;
      if (newestNavDate === null || date > newestNavDate) newestNavDate = date;
    }
  }

  const gain = current - invested;
  return {
    invested,
    current,
    gain,
    returnHundredths: invested > 0n ? divRound(gain * 10_000n, invested) : null,
    valuedCount,
    pendingCount,
    unavailableCount,
    oldestNavDate,
    newestNavDate,
  };
}
