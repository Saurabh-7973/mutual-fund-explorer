import { describe, expect, it } from '@jest/globals';

import { addDays } from '../dates';
import { VALUE_SCALE } from '../decimal';
import { formatInr } from '../format';
import { replayInvestment, rollingReturns } from '../longTerm';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;

/** One NAV a day from `start` for `days` days; `navFor` picks the NAV string per date. */
function series(start: string, days: number, navFor: (date: IsoDate) => string, skip?: (date: IsoDate) => boolean) {
  const points: NavPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(d(start), i);
    if (skip?.(date)) continue;
    const nav = navFor(date);
    points.push({ date, nav, value: Number(nav) });
  }
  return points;
}

describe('replayInvestment', () => {
  it('a monthly SIP at a flat NAV is worth exactly what went in', () => {
    const flat = series('2023-01-01', 1200, () => '10.0000');
    const sip = replayInvestment(flat, 1000, 12, 'sip');
    expect(sip?.installments).toBe(12);
    expect(formatInr(sip?.invested ?? 0n, VALUE_SCALE)).toBe('₹12,000.00');
    expect(formatInr(sip?.current ?? 0n, VALUE_SCALE)).toBe('₹12,000.00');
    expect(sip?.returnHundredths).toBe(0n);
  });

  it('a lump sum that doubles in two years shows +100% and about 41.4% a year', () => {
    const doubling = series('2024-01-01', 800, (date) => (date < d('2025-07-01') ? '10.0000' : '20.0000'));
    const last = doubling[doubling.length - 1];
    expect(last?.date).toBe('2026-03-10');
    const lump = replayInvestment(doubling, 10000, 24, 'lumpsum');
    expect(lump?.firstDate).toBe('2024-03-10');
    expect(formatInr(lump?.current ?? 0n, VALUE_SCALE)).toBe('₹20,000.00');
    expect(lump?.returnHundredths).toBe(10000n);
    expect(lump?.xirrPercent).toBeCloseTo(41.4, 0);
  });

  it('buys at the next NAV when a purchase date has none, like a real purchase', () => {
    // The series ends 2026-02-04, so a 6-month lump sum starts 2025-08-04: a holiday and the next day are missing.
    const gappy = series('2025-01-01', 400, () => '10.0000', (date) => date === '2025-08-04' || date === '2025-08-05');
    expect(replayInvestment(gappy, 1000, 6, 'lumpsum')?.firstDate).toBe('2025-08-06');
    expect(replayInvestment(gappy, 1000, 6, 'sip')?.installments).toBe(6);
  });

  it('gives no annual rate under a year, and nothing when the history is too short', () => {
    const flat = series('2026-01-01', 200, () => '10.0000');
    expect(replayInvestment(flat, 1000, 3, 'sip')?.xirrPercent).toBeNull();
    expect(replayInvestment(flat, 1000, 36, 'sip')).toBeNull();
    expect(replayInvestment(flat, 0, 3, 'sip')).toBeNull();
  });
});

describe('rollingReturns', () => {
  it('summarises every window: worst, median, best and how often it lost money', () => {
    // Flat at 10 for a year, then 8 for a year, then 12: some one-year windows lose money.
    const bumpy = series('2022-01-01', 1100, (date) =>
      date < d('2023-01-01') ? '10.0000' : date < d('2024-01-01') ? '8.0000' : '12.0000',
    );
    const rolling = rollingReturns(bumpy, 1);
    expect(rolling).not.toBeNull();
    expect(rolling?.worst).toBeCloseTo(-20, 0);
    expect(rolling?.best).toBeCloseTo(50, 0);
    expect(rolling?.lossShare).toBeGreaterThan(0);
    expect(rolling?.lossShare).toBeLessThan(1);
    expect(rolling?.from).toBe('2023-01-01');
  });

  it('is null when the history is shorter than one window', () => {
    expect(rollingReturns(series('2026-01-01', 200, () => '10.0000'), 1)).toBeNull();
  });
});
