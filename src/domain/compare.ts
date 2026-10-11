import { addMonths } from './dates';
import { NAV_SCALE, divRound, parseScaled } from './decimal';
import { lastPoint, navOnOrBefore } from './nav';
import type { IsoDate, NavPoint } from './types';

/**
 * Two funds on one scale: what ₹10,000 put into each on the same day became. Rebasing
 * to a common start is what makes two NAV histories comparable on a single axis (NAVs
 * themselves start at arbitrary prices).
 */

export const GROWTH_BASE = 10_000;

export interface GrowthPoint {
  date: IsoDate;
  a: number;
  b: number;
  /** The NAVs behind this point, so an exact value can be worked out on demand. */
  navA: string;
  navB: string;
}

export interface GrowthComparison {
  start: IsoDate;
  end: IsoDate;
  /** For drawing only (floats). */
  points: GrowthPoint[];
  /** What ₹10,000 became in each fund, exactly, in paise (scale 2). */
  endA: bigint;
  endB: bigint;
  /** The NAVs on the start date that both lines are rebased to. */
  baseNavA: string;
  baseNavB: string;
}

/** ₹10,000 × end NAV ÷ start NAV, exactly, in paise. */
function grown(start: string, end: string): bigint | null {
  const s = parseScaled(start, NAV_SCALE);
  const e = parseScaled(end, NAV_SCALE);
  if (s === null || e === null || s <= 0n) return null;
  return divRound(BigInt(GROWTH_BASE) * 100n * e, s);
}

/**
 * Growth of ₹10,000 in each fund from the later of (a) both histories having started and
 * (b) `months` before the earlier of the two latest NAVs. Dates follow fund A's NAVs; fund
 * B uses its NAV in force on each date. Float values: this is a chart, never money.
 */
export function compareGrowth(
  a: readonly NavPoint[],
  b: readonly NavPoint[],
  months: number | null,
): GrowthComparison | null {
  const firstA = a[0];
  const firstB = b[0];
  const lastA = lastPoint(a);
  const lastB = lastPoint(b);
  if (!firstA || !firstB || !lastA || !lastB) return null;
  const end = lastA.date < lastB.date ? lastA.date : lastB.date;
  const common = firstA.date > firstB.date ? firstA.date : firstB.date;
  const wanted = months === null ? common : addMonths(end, -months);
  const start = wanted > common ? wanted : common;
  if (start >= end) return null;

  const baseA = navOnOrBefore(a, start);
  const baseB = navOnOrBefore(b, start);
  if (!baseA || !baseB || baseA.value <= 0 || baseB.value <= 0) return null;

  const points: GrowthPoint[] = [{ date: start, a: GROWTH_BASE, b: GROWTH_BASE, navA: baseA.nav, navB: baseB.nav }];
  for (const p of a) {
    if (p.date <= start || p.date > end) continue;
    const pb = navOnOrBefore(b, p.date);
    if (!pb) continue;
    points.push({
      date: p.date,
      a: (p.value / baseA.value) * GROWTH_BASE,
      b: (pb.value / baseB.value) * GROWTH_BASE,
      navA: p.nav,
      navB: pb.nav,
    });
  }
  if (points.length < 2) return null;
  const endPointA = navOnOrBefore(a, end);
  const endPointB = navOnOrBefore(b, end);
  const endA = endPointA ? grown(baseA.nav, endPointA.nav) : null;
  const endB = endPointB ? grown(baseB.nav, endPointB.nav) : null;
  if (endA === null || endB === null) return null;
  return { start, end, points, endA, endB, baseNavA: baseA.nav, baseNavB: baseB.nav };
}

/** What ₹10,000 had become in each fund on one point of the comparison, exactly, in paise. */
export function growthAt(comparison: GrowthComparison, index: number): { a: bigint; b: bigint } | null {
  const point = comparison.points[index];
  if (!point) return null;
  const a = grown(comparison.baseNavA, point.navA);
  const b = grown(comparison.baseNavB, point.navB);
  return a === null || b === null ? null : { a, b };
}

/** Whether a range is fully covered by both histories (so the chart's chip can be enabled). */
export function comparisonCovers(a: readonly NavPoint[], b: readonly NavPoint[], months: number | null): boolean {
  if (months === null) return a.length > 0 && b.length > 0;
  const lastA = lastPoint(a);
  const lastB = lastPoint(b);
  const firstA = a[0];
  const firstB = b[0];
  if (!lastA || !lastB || !firstA || !firstB) return false;
  const end = lastA.date < lastB.date ? lastA.date : lastB.date;
  const start = addMonths(end, -months);
  return start >= firstA.date && start >= firstB.date;
}
