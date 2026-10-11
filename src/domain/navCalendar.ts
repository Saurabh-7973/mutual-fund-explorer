import { weekdayOf } from './calendar';
import { addDays, daysInMonth, toIsoDate } from './dates';
import { lowerBound, navChange, type NavChange } from './nav';
import type { IsoDate, NavPoint } from './types';

/**
 * NAV history as a month calendar. Funds publish on business days, so the grid has five
 * columns (Monday to Friday) unless the month has a weekend NAV; each cell is a day with
 * its NAV and its change from the previous published NAV, bucketed for a tint.
 */

export interface NavDay {
  date: IsoDate;
  /** Null on a weekday without a NAV (usually a market holiday). */
  point: NavPoint | null;
  /** Change from the previous published NAV, which may be in the month before. */
  change: NavChange | null;
  /** 0 (no change or no NAV) to 3 (a big day), for the tint's strength. */
  intensity: 0 | 1 | 2 | 3;
}

export interface NavMonth {
  year: number;
  month: number;
  /** 5 (Monday to Friday) or 7 (Sunday first) columns. */
  columns: 5 | 7;
  /** Weeks of cells; null pads before the 1st and after the last day. */
  weeks: (NavDay | null)[][];
  /** Last NAV of the month before → last NAV of this month; null without both. */
  change: NavChange | null;
  high: NavPoint | null;
  low: NavPoint | null;
  /** NAVs published in the month. */
  count: number;
}

/** Daily change, in hundredths of a percent, at which each tint step starts. */
export const INTENSITY_STEPS = [25n, 100n, 200n] as const;

export function intensityOf(change: NavChange | null): NavDay['intensity'] {
  if (change === null) return 0;
  const size = change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths;
  if (size >= INTENSITY_STEPS[2]) return 3;
  if (size >= INTENSITY_STEPS[1]) return 2;
  if (size >= INTENSITY_STEPS[0]) return 1;
  return 0;
}

export function navMonth(points: readonly NavPoint[], year: number, month: number): NavMonth {
  const first = toIsoDate(year, month, 1);
  const lastDay = toIsoDate(year, month, daysInMonth(year, month));
  const start = lowerBound(points, first);
  const byDate = new Map<IsoDate, { point: NavPoint; previous: NavPoint | undefined }>();
  let high: NavPoint | null = null;
  let low: NavPoint | null = null;
  let weekend = false;
  for (let i = start; i < points.length; i++) {
    const point = points[i];
    if (point === undefined || point.date > lastDay) break;
    byDate.set(point.date, { point, previous: points[i - 1] });
    if (high === null || point.value > high.value) high = point;
    if (low === null || point.value < low.value) low = point;
    const weekday = weekdayOf(point.date);
    if (weekday === 0 || weekday === 6) weekend = true;
  }
  const columns: 5 | 7 = weekend ? 7 : 5;

  const cells: (NavDay | null)[] = [];
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const date = toIsoDate(year, month, day);
    const weekday = weekdayOf(date);
    if (columns === 5 && (weekday === 0 || weekday === 6)) continue;
    if (cells.length === 0) {
      // Pad the first week up to this day's column.
      const column = columns === 5 ? weekday - 1 : weekday;
      for (let pad = 0; pad < column; pad++) cells.push(null);
    }
    const entry = byDate.get(date);
    const change = entry !== undefined && entry.previous !== undefined ? navChange(entry.previous, entry.point) : null;
    cells.push({ date, point: entry?.point ?? null, change, intensity: intensityOf(change) });
  }
  while (cells.length % columns !== 0) cells.push(null);
  const weeks: (NavDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += columns) weeks.push(cells.slice(i, i + columns));

  const before = start > 0 ? points[start - 1] : undefined;
  // The month's last NAV: the point just before the first date after the month.
  const after = lowerBound(points, addDays(lastDay, 1));
  const close = after > start ? points[after - 1] : undefined;
  return {
    year,
    month,
    columns,
    weeks,
    change: before !== undefined && close !== undefined ? navChange(before, close) : null,
    high,
    low,
    count: byDate.size,
  };
}
