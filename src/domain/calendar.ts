import { dayNumber, daysInMonth, isoParts, toIsoDate } from './dates';
import type { IsoDate } from './types';

/** Sunday = 0 … Saturday = 6. 1 Jan 1970 (day 0) was a Thursday. */
export function weekdayOf(date: IsoDate): number {
  return (((dayNumber(date) + 4) % 7) + 7) % 7;
}

/**
 * One month as calendar weeks, Sunday first, padded with nulls before the 1st and after
 * the last day so every week has seven cells.
 */
export function monthGrid(year: number, month: number): (IsoDate | null)[][] {
  const first = toIsoDate(year, month, 1);
  const cells: (IsoDate | null)[] = Array.from({ length: weekdayOf(first) }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day++) cells.push(toIsoDate(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** The month a calendar should open on: the chosen date's, else the latest allowed. */
export function openingMonth(value: IsoDate | null, max: IsoDate): { year: number; month: number } {
  const { year, month } = isoParts(value ?? max);
  return { year, month };
}

/** Steps a (year, month) pair by whole months. */
export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + by;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** Whether any day of the month falls inside [min, max]. */
export function monthHasSelectable(year: number, month: number, min: IsoDate | null, max: IsoDate): boolean {
  const first = toIsoDate(year, month, 1);
  const last = toIsoDate(year, month, daysInMonth(year, month));
  return last >= (min ?? first) && first <= max;
}
