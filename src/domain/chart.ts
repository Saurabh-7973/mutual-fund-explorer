import { dayNumber, diffDays, formatDate } from './dates';
import { formatNav, formatPercentHundredths } from './format';
import { lttbIndices } from './lttb';
import { navChange } from './nav';
import type { IsoDate, NavPoint } from './types';

/**
 * Pure geometry for the NAV line chart, so the SVG component only draws.
 *
 * x is proportional to calendar days, not to the row index: a hole in the data
 * shows as a long straight segment instead of being silently closed up.
 * Long series are downsampled with LTTB to about one point per 2–3 px.
 */

export interface ChartBox {
  width: number;
  height: number;
  /** Free space inside the box, in px. */
  padTop: number;
  padBottom: number;
  padX: number;
}

export interface ChartGeometry {
  /** The points actually drawn (downsampled), oldest first. */
  points: NavPoint[];
  /** Pixel position of each drawn point. */
  xs: number[];
  ys: number[];
  /** SVG path data for the line. */
  line: string;
  /** Closed SVG path data for the fill under the line. */
  area: string;
  minValue: number;
  maxValue: number;
}

/** Enough for a phone-width chart; a 5,000-row history is drawn as 150 points. */
export const MAX_CHART_POINTS = 150;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function buildChartGeometry(
  series: readonly NavPoint[],
  box: ChartBox,
  maxPoints: number = MAX_CHART_POINTS,
): ChartGeometry | null {
  const innerWidth = box.width - 2 * box.padX;
  const innerHeight = box.height - box.padTop - box.padBottom;
  if (series.length < 2 || innerWidth <= 0 || innerHeight <= 0) return null;

  const days = series.map((point) => dayNumber(point.date));
  const values = series.map((point) => point.value);
  const threshold = Math.max(3, Math.min(maxPoints, Math.floor(innerWidth)));

  const points: NavPoint[] = [];
  const keptDays: number[] = [];
  for (const index of lttbIndices(days, values, threshold)) {
    const point = series[index];
    const day = days[index];
    if (point !== undefined && day !== undefined) {
      points.push(point);
      keptDays.push(day);
    }
  }
  const firstDay = keptDays[0];
  const lastDay = keptDays[keptDays.length - 1];
  if (points.length < 2 || firstDay === undefined || lastDay === undefined || lastDay <= firstDay) return null;

  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (point.value < minValue) minValue = point.value;
    if (point.value > maxValue) maxValue = point.value;
  }
  const span = maxValue - minValue;

  const xs = keptDays.map((day) => round1(box.padX + ((day - firstDay) / (lastDay - firstDay)) * innerWidth));
  const ys = points.map((point) =>
    round1(span === 0 ? box.padTop + innerHeight / 2 : box.padTop + ((maxValue - point.value) / span) * innerHeight),
  );

  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x} ${ys[i] ?? 0}`).join(' ');
  const baseline = round1(box.padTop + innerHeight);
  const firstX = xs[0] ?? 0;
  const lastX = xs[xs.length - 1] ?? 0;
  const area = `${line} L${lastX} ${baseline} L${firstX} ${baseline} Z`;

  return { points, xs, ys, line, area, minValue, maxValue };
}

/** Index of the drawn point nearest to a touch at pixel x; -1 when nothing is drawn. */
export function nearestIndex(xs: readonly number[], x: number): number {
  if (xs.length === 0) return -1;
  let lo = 0;
  let hi = xs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((xs[mid] ?? 0) < x) lo = mid + 1;
    else hi = mid;
  }
  const before = xs[lo - 1];
  const at = xs[lo] ?? 0;
  return before !== undefined && Math.abs(before - x) <= Math.abs(at - x) ? lo - 1 : lo;
}

/** Spoken summary for screen readers: what the chart shows, in one sentence. */
export function chartSummary(series: readonly NavPoint[]): string | null {
  const first = series[0];
  const last = series[series.length - 1];
  if (first === undefined || last === undefined || first.date === last.date) return null;
  const change = navChange(first, last);
  if (change === null) return null;
  const from = `from ${formatNav(first.nav)} on ${formatDate(first.date)} to ${formatNav(last.nav)} on ${formatDate(last.date)}`;
  if (change.diff === 0n) return `NAV unchanged ${from}`;
  const magnitude = change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths;
  const direction = change.diff > 0n ? 'up' : 'down';
  return `NAV ${direction} ${formatPercentHundredths(magnitude, 'negative-only')} ${from}`;
}

/** Spans up to this many days tick on every point while scrubbed (1M and 3M); longer ones once a month. */
export const TICK_EVERY_POINT_DAYS = 100;

/**
 * The step a scrub gives a haptic tick on. Over a year a drag crosses ~150 drawn points,
 * and a tick on each is a buzz, not a cue; a tick per month reads like a ruler's marks.
 * The chart ticks whenever this key changes.
 */
export function scrubTickKey(date: IsoDate, first: IsoDate, last: IsoDate): string {
  return diffDays(first, last) <= TICK_EVERY_POINT_DAYS ? date : date.slice(0, 7);
}
