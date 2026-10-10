import type { IsoDate } from './types';

/**
 * Date handling without time zones.
 *
 * NAV dates are Indian business dates, not instants. Everything here works on
 * calendar fields ("YYYY-MM-DD") and uses UTC arithmetic only to count days,
 * so a phone set to any time zone gets the same answers.
 */

const API_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const DAY_MS = 86_400_000;
/** India Standard Time is UTC+05:30 all year (no daylight saving). */
const IST_OFFSET_MS = 330 * 60_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of `month`.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidYmd(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2999 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad2(month)}-${pad2(day)}` as IsoDate;
}

/**
 * Parses mfapi.in's "DD-MM-YYYY". Returns null for malformed input and for
 * impossible dates such as 31-02-2024, instead of letting `new Date()` roll them over.
 */
export function parseApiDate(input: string): IsoDate | null {
  const match = API_DATE.exec(input.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return isValidYmd(year, month, day) ? toIsoDate(year, month, day) : null;
}

/** Validates a stored "YYYY-MM-DD" (for example from persisted state). */
export function parseIsoDate(input: string): IsoDate | null {
  const match = ISO_DATE.exec(input);
  if (!match) return null;
  return isValidYmd(Number(match[1]), Number(match[2]), Number(match[3])) ? (input as IsoDate) : null;
}

export function isoParts(date: IsoDate): { year: number; month: number; day: number } {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/** Whole days since 1970-01-01, using calendar fields only. */
export function dayNumber(date: IsoDate): number {
  const { year, month, day } = isoParts(date);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function fromDayNumber(days: number): IsoDate {
  const d = new Date(days * DAY_MS);
  return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Calendar days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(dayNumber(date) + days);
}

/**
 * Moves by calendar months and clamps the day to the target month's length,
 * so 31 Mar minus one month is 29 Feb in a leap year and 28 Feb otherwise.
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const { year, month, day } = isoParts(date);
  const total = year * 12 + (month - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = total - newYear * 12 + 1;
  return toIsoDate(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
}

/**
 * Today's date in India, whatever the phone's time zone. "Is this purchase date
 * in the future?" is a question about Indian business days.
 */
export function todayInIndia(nowMs: number = Date.now()): IsoDate {
  const shifted = new Date(nowMs + IST_OFFSET_MS);
  return toIsoDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** "09 Oct 2026" */
export function formatDate(date: IsoDate): string {
  const { year, month, day } = isoParts(date);
  return `${pad2(day)} ${MONTHS[month - 1] ?? '???'} ${year}`;
}

/**
 * "as of 09 Oct 2026", or "NAVs from 08 Oct 2026 to 09 Oct 2026" when funds were
 * valued on different days (funds of funds and overseas funds publish a day late).
 */
export function formatAsOf(oldest: IsoDate | null, newest: IsoDate | null): string {
  if (oldest === null || newest === null) return '';
  if (oldest === newest) return `as of ${formatDate(newest)}`;
  return `NAVs from ${formatDate(oldest)} to ${formatDate(newest)}`;
}

/** "Oct '26" for compact chart labels. */
export function formatMonthYear(date: IsoDate): string {
  const { year, month } = isoParts(date);
  return `${MONTHS[month - 1] ?? '???'} '${String(year).slice(2)}`;
}

/** Keeps a date inside [min, max]; a null bound is open. */
export function clampDate(date: IsoDate, min: IsoDate | null, max: IsoDate | null): IsoDate {
  if (min !== null && date < min) return min;
  if (max !== null && date > max) return max;
  return date;
}

/**
 * Native date pickers work in device-local time. Build a local-midnight Date
 * from calendar fields so the picker shows exactly this calendar date.
 */
export function toLocalDate(date: IsoDate): Date {
  const { year, month, day } = isoParts(date);
  return new Date(year, month - 1, day);
}

/** Converts a picker's Date back using the local calendar fields the user saw. */
export function fromLocalDate(value: Date): IsoDate {
  return toIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

/** A span of days as people say it: "5 months", "1 year 2 months" (never less than a month). */
export function formatDuration(days: number): string {
  const months = Math.max(1, Math.round(days / 30.44));
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} ${years === 1 ? 'year' : 'years'}${rest > 0 ? ` ${rest} ${rest === 1 ? 'month' : 'months'}` : ''}`;
}

/** "1st", "2nd", "3rd", "11th", "22nd": a day of the month as people say it. */
export function ordinalDay(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
  return `${day}${suffix}`;
}
