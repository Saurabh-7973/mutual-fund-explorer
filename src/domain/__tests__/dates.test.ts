import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  addMonths,
  clampDate,
  diffDays,
  formatAsOf,
  formatDate,
  formatDuration,
  formatMonthYear,
  fromLocalDate,
  parseApiDate,
  parseIsoDate,
  todayInIndia,
  toLocalDate,
} from '../dates';
import type { IsoDate } from '../types';

const d = (value: string) => value as IsoDate;

describe('parseApiDate (DD-MM-YYYY)', () => {
  it('parses valid dates into ISO form', () => {
    expect(parseApiDate('09-10-2026')).toBe('2026-10-09');
    expect(parseApiDate(' 09-10-2026 ')).toBe('2026-10-09');
  });

  it('accepts 29 Feb only in leap years', () => {
    expect(parseApiDate('29-02-2024')).toBe('2024-02-29');
    expect(parseApiDate('29-02-2023')).toBeNull();
  });

  it('rejects impossible and malformed dates instead of rolling them over', () => {
    expect(parseApiDate('31-04-2026')).toBeNull();
    expect(parseApiDate('00-10-2026')).toBeNull();
    expect(parseApiDate('9-10-2026')).toBeNull();
    expect(parseApiDate('2026-10-09')).toBeNull();
    expect(parseApiDate('')).toBeNull();
  });
});

describe('parseIsoDate', () => {
  it('validates stored ISO dates', () => {
    expect(parseIsoDate('2024-02-29')).toBe('2024-02-29');
    expect(parseIsoDate('2023-02-29')).toBeNull();
    expect(parseIsoDate('29-02-2024')).toBeNull();
  });
});

describe('calendar arithmetic', () => {
  it('counts days across month ends and leap days', () => {
    expect(diffDays(d('2023-08-14'), d('2023-08-16'))).toBe(2);
    expect(diffDays(d('2024-02-28'), d('2024-03-01'))).toBe(2);
    expect(diffDays(d('2026-10-10'), d('2026-10-08'))).toBe(-2);
    expect(addDays(d('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDays(d('2024-12-31'), 1)).toBe('2025-01-01');
  });

  it('moves by calendar months and clamps the day', () => {
    expect(addMonths(d('2024-03-31'), -1)).toBe('2024-02-29');
    expect(addMonths(d('2023-03-31'), -1)).toBe('2023-02-28');
    expect(addMonths(d('2026-01-31'), 1)).toBe('2026-02-28');
    expect(addMonths(d('2026-10-09'), -12)).toBe('2025-10-09');
    expect(addMonths(d('2026-01-15'), -13)).toBe('2024-12-15');
  });
});

describe('todayInIndia', () => {
  it('switches date at midnight IST, not device midnight', () => {
    // 18:29 UTC = 23:59 IST on 9 Oct; 18:30 UTC = 00:00 IST on 10 Oct.
    expect(todayInIndia(Date.UTC(2026, 9, 9, 18, 29))).toBe('2026-10-09');
    expect(todayInIndia(Date.UTC(2026, 9, 9, 18, 30))).toBe('2026-10-10');
  });
});

describe('display formatting', () => {
  it('formats dates for people', () => {
    expect(formatDate(d('2026-10-09'))).toBe('09 Oct 2026');
    expect(formatMonthYear(d('2026-10-09'))).toBe("Oct '26");
  });

  it('says which NAV dates a total uses', () => {
    expect(formatAsOf(d('2026-10-09'), d('2026-10-09'))).toBe('as of 09 Oct 2026');
    expect(formatAsOf(d('2026-10-08'), d('2026-10-09'))).toBe('NAVs from 08 Oct 2026 to 09 Oct 2026');
    expect(formatAsOf(null, null)).toBe('');
  });

  it('clamps a date into a range for the date picker', () => {
    expect(clampDate(d('2010-01-01'), d('2013-05-28'), d('2026-10-10'))).toBe('2013-05-28');
    expect(clampDate(d('2027-01-01'), d('2013-05-28'), d('2026-10-10'))).toBe('2026-10-10');
    expect(clampDate(d('2020-02-29'), null, null)).toBe('2020-02-29');
  });

  it('round-trips through local Date objects used by native pickers', () => {
    expect(fromLocalDate(toLocalDate(d('2024-02-29')))).toBe('2024-02-29');
    expect(fromLocalDate(toLocalDate(d('2026-01-01')))).toBe('2026-01-01');
  });
});

describe('formatDuration', () => {
  it('reads like speech', () => {
    expect(formatDuration(3)).toBe('1 month');
    expect(formatDuration(231)).toBe('8 months');
    expect(formatDuration(365)).toBe('1 year');
    expect(formatDuration(430)).toBe('1 year 2 months');
    expect(formatDuration(1100)).toBe('3 years');
  });
});
