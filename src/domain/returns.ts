import { addMonths, diffDays } from './dates';
import { navOnOrBefore } from './nav';
import type { IsoDate, NavPoint } from './types';

/**
 * Point-to-point NAV returns, presented the way SEBI requires:
 * absolute for periods under one year, compounded annualised (CAGR) from one year.
 * These are NAV returns: IDCW payouts are not added back.
 */

export type ReturnKind = 'absolute' | 'annualised';

export interface PeriodReturn {
  key: string;
  label: string;
  kind: ReturnKind;
  /** Percent, e.g. 12.34. Null when the history doesn't reach back far enough. */
  percent: number | null;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
}

export const RETURN_PERIODS: readonly { key: string; label: string; months: number | null }[] = [
  { key: '1M', label: '1 month', months: 1 },
  { key: '3M', label: '3 months', months: 3 },
  { key: '6M', label: '6 months', months: 6 },
  { key: '1Y', label: '1 year', months: 12 },
  { key: '3Y', label: '3 years', months: 36 },
  { key: '5Y', label: '5 years', months: 60 },
  { key: '10Y', label: '10 years', months: 120 },
  { key: 'ALL', label: 'Since start', months: null },
];

const DAYS_PER_YEAR = 365;

/** Absolute below 365 days, CAGR from 365 days. Returns a percentage. */
export function pointToPointReturn(start: NavPoint, end: NavPoint): { kind: ReturnKind; percent: number } | null {
  const days = diffDays(start.date, end.date);
  if (days <= 0 || start.value <= 0 || end.value <= 0) return null;
  const ratio = end.value / start.value;
  if (days < DAYS_PER_YEAR) return { kind: 'absolute', percent: (ratio - 1) * 100 };
  return { kind: 'annualised', percent: (Math.pow(ratio, DAYS_PER_YEAR / days) - 1) * 100 };
}

/** Trailing returns ending at the latest NAV, starting from the NAV in force on each start date. */
export function trailingReturns(points: readonly NavPoint[]): PeriodReturn[] {
  const first = points[0];
  const last = points.length > 0 ? points[points.length - 1] : undefined;
  return RETURN_PERIODS.map(({ key, label, months }) => {
    const plannedKind: ReturnKind = months !== null && months < 12 ? 'absolute' : 'annualised';
    const empty: PeriodReturn = { key, label, kind: plannedKind, percent: null, startDate: null, endDate: null };
    if (first === undefined || last === undefined) return empty;
    const target = months === null ? first.date : addMonths(last.date, -months);
    if (target < first.date) return empty;
    const start = months === null ? first : navOnOrBefore(points, target);
    if (start === null) return empty;
    const result = pointToPointReturn(start, last);
    if (result === null) return empty;
    return { key, label, kind: result.kind, percent: result.percent, startDate: start.date, endDate: last.date };
  });
}

/**
 * The one return a fund page leads with: 3-year CAGR, the horizon long-term investors
 * and SEBI factsheets compare on; else 1 year; else since start. Null with no history.
 */
export function headlineReturn(rows: readonly PeriodReturn[]): PeriodReturn | null {
  for (const key of ['3Y', '1Y', 'ALL']) {
    const row = rows.find((r) => r.key === key && r.percent !== null);
    if (row !== undefined) return row;
  }
  return null;
}
