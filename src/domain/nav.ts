import { NAV_SCALE, divRound, parseScaled } from './decimal';
import { addMonths, diffDays, formatDate } from './dates';
import type { IsoDate, NavPoint } from './types';

/**
 * NAV series rules. Points are always ascending by date with one point per date.
 *
 * Two lookups answer two different questions:
 *  - navOnOrBefore: "what was the NAV as of this date?" (trailing returns, charts)
 *  - navOnOrAfter:  "which NAV did a purchase on this date get?" (holdings)
 * A purchase made when no NAV is struck (weekend, holiday, or after the last
 * published NAV) is priced at the next NAV, which is how allotment works.
 */

/** A matched NAV more than this many days after the purchase date gets a data-gap warning. */
export const GAP_WARNING_DAYS = 5;
/** A latest NAV older than this suggests a closed or merged scheme. */
export const STALE_AFTER_DAYS = 7;

/** Sorts ascending and keeps the first row the API listed for each date. */
export function buildSeries(rows: readonly NavPoint[]): { points: NavPoint[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: NavPoint[] = [];
  for (const row of rows) {
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    unique.push(row);
  }
  unique.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { points: unique, duplicates: rows.length - unique.length };
}

/** Index of the first point dated on or after `date`; `points.length` when there is none. */
export function lowerBound(points: readonly NavPoint[], date: IsoDate): number {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const point = points[mid];
    if (point !== undefined && point.date < date) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The NAV in force on `date`: the last point on or before it. */
export function navOnOrBefore(points: readonly NavPoint[], date: IsoDate): NavPoint | null {
  const index = lowerBound(points, date);
  const atIndex = points[index];
  if (atIndex !== undefined && atIndex.date === date) return atIndex;
  return index > 0 ? (points[index - 1] ?? null) : null;
}

/** The first point on or after `date`. */
export function navOnOrAfter(points: readonly NavPoint[], date: IsoDate): NavPoint | null {
  return points[lowerBound(points, date)] ?? null;
}

export function lastPoint(points: readonly NavPoint[]): NavPoint | null {
  return points.length > 0 ? (points[points.length - 1] ?? null) : null;
}

export type PurchaseNavResolution =
  /** A NAV applies. gapDays = calendar days from the purchase date to that NAV's date. */
  | { kind: 'matched'; point: NavPoint; gapDays: number }
  | { kind: 'future'; today: IsoDate }
  | { kind: 'no-data' }
  | { kind: 'before-first'; firstDate: IsoDate }
  /** No NAV on or after the purchase date has been published yet. */
  | { kind: 'pending'; lastDate: IsoDate };

/**
 * The app's purchase rule: a purchase gets the first NAV on or after its date.
 * Checks run in this order: future date, no data, before the earliest NAV, then match or pending.
 */
export function resolvePurchaseNav(
  points: readonly NavPoint[],
  purchaseDate: IsoDate,
  today: IsoDate,
): PurchaseNavResolution {
  if (purchaseDate > today) return { kind: 'future', today };
  const first = points[0];
  const last = lastPoint(points);
  if (first === undefined || last === null) return { kind: 'no-data' };
  if (purchaseDate < first.date) return { kind: 'before-first', firstDate: first.date };
  const match = navOnOrAfter(points, purchaseDate);
  if (match === null) return { kind: 'pending', lastDate: last.date };
  return { kind: 'matched', point: match, gapDays: diffDays(purchaseDate, match.date) };
}

/**
 * resolvePurchaseNav on the history, plus the one safe use of /latest.
 *
 * The history endpoint can lag /latest by a day. A purchase dated exactly on the
 * latest NAV's date gets that NAV. A /latest date after the purchase date is not
 * used, because NAVs in between may still be missing from the history; the lot
 * stays pending until the history catches up.
 */
export function resolvePurchaseNavWithLatest(
  points: readonly NavPoint[],
  latest: NavPoint | null,
  purchaseDate: IsoDate,
  today: IsoDate,
): PurchaseNavResolution {
  const resolution = resolvePurchaseNav(points, purchaseDate, today);
  if (resolution.kind === 'pending' && latest !== null && latest.date === purchaseDate) {
    return { kind: 'matched', point: latest, gapDays: 0 };
  }
  return resolution;
}

/**
 * Adds a fresher NAV from the /latest endpoint to a history series.
 * mfapi's history endpoint can lag /latest by a day; a same-date value replaces the old one.
 */
export function mergeLatest(points: readonly NavPoint[], latest: NavPoint | null): NavPoint[] {
  const last = lastPoint(points);
  if (latest === null || (last !== null && latest.date < last.date)) return [...points];
  if (last !== null && latest.date === last.date) return [...points.slice(0, -1), latest];
  return [...points, latest];
}

export interface NavChange {
  from: NavPoint;
  to: NavPoint;
  /** NAV difference, scaled by 10^NAV_SCALE. */
  diff: bigint;
  /** Change in hundredths of a percent (1234n = 12.34%). */
  pctHundredths: bigint;
}

/** Change between two published NAVs, computed exactly. */
export function navChange(from: NavPoint, to: NavPoint): NavChange | null {
  const a = parseScaled(from.nav, NAV_SCALE);
  const b = parseScaled(to.nav, NAV_SCALE);
  if (a === null || b === null || a <= 0n) return null;
  const diff = b - a;
  return { from, to, diff, pctHundredths: divRound(diff * 10_000n, a) };
}

/** Change from the previous published NAV to the latest one. */
export function latestChange(points: readonly NavPoint[]): NavChange | null {
  if (points.length < 2) return null;
  const previous = points[points.length - 2];
  const latest = points[points.length - 1];
  return previous !== undefined && latest !== undefined ? navChange(previous, latest) : null;
}

export function isStale(lastDate: IsoDate, today: IsoDate): boolean {
  return diffDays(lastDate, today) > STALE_AFTER_DAYS;
}

/** One row of the NAV history list. */
export interface NavRow {
  date: IsoDate;
  nav: string;
  /** Change from the previous published NAV (scaled by 10^NAV_SCALE); null for the first NAV. */
  diff: bigint | null;
  /** The same change in hundredths of a percent. */
  pctHundredths: bigint | null;
}

/** History rows newest first, each with its change from the previous NAV. Built once per series. */
export function navRowsNewestFirst(points: readonly NavPoint[]): NavRow[] {
  const rows: NavRow[] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    if (point === undefined) continue;
    const previous = i > 0 ? points[i - 1] : undefined;
    const change = previous !== undefined ? navChange(previous, point) : null;
    rows.push({
      date: point.date,
      nav: point.nav,
      diff: change?.diff ?? null,
      pctHundredths: change?.pctHundredths ?? null,
    });
  }
  return rows;
}

export type ChartRange = '1M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';

export const CHART_RANGES: readonly { key: ChartRange; label: string; months: number | null }[] = [
  { key: '1M', label: '1M', months: 1 },
  { key: '6M', label: '6M', months: 6 },
  { key: '1Y', label: '1Y', months: 12 },
  { key: '3Y', label: '3Y', months: 36 },
  { key: '5Y', label: '5Y', months: 60 },
  { key: 'ALL', label: 'All', months: null },
];

/** An item in the NAV history list: a NAV row, or a marker for an unusual gap between two NAVs. */
export type NavListItem =
  | { kind: 'nav'; row: NavRow }
  | { kind: 'gap'; from: IsoDate; to: IsoDate; days: number };

/**
 * Newest-first rows with a marker wherever consecutive NAVs are more than
 * GAP_WARNING_DAYS apart. Weekends and ordinary holidays stay unmarked; a
 * long hole in the data is shown instead of silently skipped.
 */
export function navListItems(points: readonly NavPoint[]): NavListItem[] {
  const items: NavListItem[] = [];
  const rows = navRowsNewestFirst(points);
  rows.forEach((row, i) => {
    items.push({ kind: 'nav', row });
    const older = rows[i + 1];
    if (older === undefined) return;
    const days = diffDays(older.date, row.date);
    if (days > GAP_WARNING_DAYS) items.push({ kind: 'gap', from: older.date, to: row.date, days });
  });
  return items;
}

/** True when the history reaches back to the start of a range. 'All' (null) is always covered. */
export function rangeCovered(points: readonly NavPoint[], months: number | null): boolean {
  const first = points[0];
  const last = lastPoint(points);
  if (first === undefined || last === null) return false;
  return months === null || addMonths(last.date, -months) >= first.date;
}

/**
 * Points for a chart range. The window starts at the NAV in force on the start
 * date (on or before), the same base the trailing returns use.
 */
export function sliceRange(points: readonly NavPoint[], months: number | null): NavPoint[] {
  const last = lastPoint(points);
  if (last === null || months === null) return [...points];
  const start = addMonths(last.date, -months);
  const index = lowerBound(points, start);
  const atIndex = points[index];
  const startIndex = atIndex !== undefined && atIndex.date === start ? index : Math.max(0, index - 1);
  return points.slice(startIndex);
}

/** The range a fund screen opens on: 1 year when the history covers it, otherwise all of it. */
export function defaultChartRange(points: readonly NavPoint[]): ChartRange {
  return rangeCovered(points, 12) ? '1Y' : 'ALL';
}

const RANGE_WORDS: Record<Exclude<ChartRange, 'ALL'>, string> = {
  '1M': '1 month',
  '6M': '6 months',
  '1Y': '1 year',
  '3Y': '3 years',
  '5Y': '5 years',
};

/** How a range reads in a sentence: "1 year", or "since 28 May 2013" for All. */
export function chartRangeLabel(range: ChartRange, points: readonly NavPoint[]): string {
  if (range !== 'ALL') return RANGE_WORDS[range];
  const first = points[0];
  return first === undefined ? 'all NAVs' : `since ${formatDate(first.date)}`;
}

/**
 * The day's change for a list row: from the previous NAV to the latest one, using a
 * short recent window plus the fresher /latest point (the history can lag by a day).
 * Null when there aren't two NAVs, or when the change wouldn't end at the latest NAV.
 */
export function dayChange(recent: readonly NavPoint[], latest: NavPoint | null): NavChange | null {
  const change = latestChange(mergeLatest(recent, latest));
  if (change === null) return null;
  return latest === null || change.to.date === latest.date ? change : null;
}
