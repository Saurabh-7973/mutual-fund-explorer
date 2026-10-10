import { addMonths, diffDays } from './dates';
import { NAV_SCALE, UNITS_SCALE, VALUE_SCALE, divRound, parseScaled, pow10, toNumber } from './decimal';
import { lastPoint, navOnOrAfter, navOnOrBefore } from './nav';
import type { IsoDate, NavPoint } from './types';
import { xirrPercent, type CashFlow } from './xirr';

/**
 * Long-term views of a fund's own NAV history: what a regular investment would be
 * worth today, and how consistent its returns were over every multi-year window.
 * Both replay real NAVs; neither assumes a rate of return.
 */

export type InvestMode = 'sip' | 'lumpsum';

export interface InvestmentReplay {
  mode: InvestMode;
  /** Number of purchases made (1 for a lump sum). */
  installments: number;
  firstDate: IsoDate;
  /** The NAV date the value is measured at (the latest NAV). */
  valueDate: IsoDate;
  /** Rupees at VALUE_SCALE. */
  invested: bigint;
  current: bigint;
  gain: bigint;
  returnHundredths: bigint;
  /** Annual rate across all purchases; null under a year (shown as absolute instead). */
  xirrPercent: number | null;
}

const DAYS_PER_YEAR = 365;

/**
 * Replays investing `amountRupees` once (lump sum) or every month (SIP) for the last
 * `months` months. Each purchase gets the first NAV on or after its date, the same rule
 * as a real holding, and units are allotted to 4 decimals. Null when the history doesn't
 * reach back far enough.
 */
export function replayInvestment(
  points: readonly NavPoint[],
  amountRupees: number,
  months: number,
  mode: InvestMode,
): InvestmentReplay | null {
  const last = lastPoint(points);
  const first = points[0];
  if (last === null || first === undefined || !Number.isInteger(amountRupees) || amountRupees <= 0 || months <= 0) {
    return null;
  }
  const start = addMonths(last.date, -months);
  if (start < first.date) return null;
  const lastNav = parseScaled(last.nav, NAV_SCALE);
  if (lastNav === null) return null;

  const amount = BigInt(amountRupees);
  const dates = mode === 'lumpsum' ? [start] : Array.from({ length: months }, (_, i) => addMonths(start, i));
  let units = 0n;
  let installments = 0;
  const flows: CashFlow[] = [];
  let firstDate: IsoDate | null = null;
  for (const date of dates) {
    const point = navOnOrAfter(points, date);
    const nav = point === null ? null : parseScaled(point.nav, NAV_SCALE);
    if (point === null || nav === null || nav <= 0n) continue;
    // amount / nav, kept at UNITS_SCALE: (amount × 10^(units + nav scale)) / nav.
    units += divRound(amount * pow10(UNITS_SCALE + NAV_SCALE), nav);
    installments++;
    firstDate ??= point.date;
    flows.push({ date: point.date, amount: -amountRupees });
  }
  if (installments === 0 || firstDate === null) return null;

  const invested = amount * BigInt(installments) * pow10(VALUE_SCALE);
  const current = units * lastNav;
  const gain = current - invested;
  flows.push({ date: last.date, amount: toNumber(current, VALUE_SCALE) });
  return {
    mode,
    installments,
    firstDate,
    valueDate: last.date,
    invested,
    current,
    gain,
    returnHundredths: divRound(gain * 10_000n, invested),
    xirrPercent: diffDays(firstDate, last.date) >= DAYS_PER_YEAR ? xirrPercent(flows) : null,
  };
}

export interface RollingSummary {
  years: number;
  /** How many start dates were measured (one per published NAV). */
  windows: number;
  /** Annualised percentages. */
  worst: number;
  median: number;
  best: number;
  /** Share of windows that ended below where they started, 0 to 1. */
  lossShare: number;
  /** First and last end dates measured. */
  from: IsoDate;
  through: IsoDate;
}

/**
 * Rolling returns: the CAGR over every `years`-long window that ends on a published NAV,
 * each starting from the NAV in force on its start date (on or before, as trailing
 * returns do). Answers "if I had held for N years at any point, what did I get?".
 * Null when the history is shorter than one window.
 */
export function rollingReturns(points: readonly NavPoint[], years: number): RollingSummary | null {
  const first = points[0];
  if (first === undefined || years <= 0) return null;
  const rates: number[] = [];
  let losses = 0;
  let from: IsoDate | null = null;
  let through: IsoDate | null = null;
  for (const end of points) {
    const startDate = addMonths(end.date, -12 * years);
    if (startDate < first.date) continue;
    const start = navOnOrBefore(points, startDate);
    if (start === null || start.value <= 0 || end.value <= 0) continue;
    const days = diffDays(start.date, end.date);
    if (days <= 0) continue;
    const rate = (Math.pow(end.value / start.value, DAYS_PER_YEAR / days) - 1) * 100;
    rates.push(rate);
    if (end.value < start.value) losses++;
    from ??= end.date;
    through = end.date;
  }
  if (rates.length === 0 || from === null || through === null) return null;
  const sorted = [...rates].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return {
    years,
    windows: rates.length,
    worst: sorted[0] ?? 0,
    median,
    best: sorted[sorted.length - 1] ?? 0,
    lossShare: losses / rates.length,
    from,
    through,
  };
}

export interface Drawdown {
  /** The fall from the peak to the trough, as a negative percentage. */
  percent: number;
  peak: NavPoint;
  trough: NavPoint;
  /** First NAV back at or above the peak; null if it hasn't recovered yet. */
  recovered: NavPoint | null;
  /** Calendar days from the trough to the recovery, or to the latest NAV while still below. */
  daysToRecover: number;
}

/**
 * The worst fall in the NAV: the largest drop from a high point to a later low, and when
 * (if) the NAV got back to that high. How much patience the fund has demanded before.
 * Null with fewer than two NAVs or when the NAV never fell.
 */
export function maxDrawdown(points: readonly NavPoint[]): Drawdown | null {
  let peak = points[0];
  if (peak === undefined) return null;
  let worst: { peak: NavPoint; trough: NavPoint; ratio: number } | null = null;
  for (const point of points) {
    if (point.value > peak.value) peak = point;
    const ratio = point.value / peak.value;
    if (ratio < 1 && (worst === null || ratio < worst.ratio)) worst = { peak, trough: point, ratio };
  }
  if (worst === null) return null;
  const { peak: high, trough, ratio } = worst;
  const after = points.find((p) => p.date > trough.date && p.value >= high.value) ?? null;
  const last = points[points.length - 1] ?? trough;
  return {
    percent: (ratio - 1) * 100,
    peak: high,
    trough,
    recovered: after,
    daysToRecover: diffDays(trough.date, (after ?? last).date),
  };
}
