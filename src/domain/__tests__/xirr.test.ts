import { describe, expect, it } from '@jest/globals';

import { diffDays } from '../dates';
import type { IsoDate } from '../types';
import { valueLot } from '../valuation';
import { xirrPercent, type CashFlow } from '../xirr';

const d = (value: string) => value as IsoDate;

describe('xirrPercent', () => {
  it('equals the CAGR for a single purchase', () => {
    const lot = valueLot({
      units: '125.432',
      appliedNav: '74.8685',
      appliedDate: d('2024-03-31'),
      latestNav: '88.9258',
      latestDate: d('2026-10-09'),
    });
    const rate = xirrPercent([
      { date: d('2024-03-31'), amount: -9390.905692 },
      { date: d('2026-10-09'), amount: 11154.1409456 },
    ]);
    expect(lot?.cagrPercent).not.toBeNull();
    expect(rate).toBeCloseTo(lot?.cagrPercent ?? Number.NaN, 6);
  });

  it('finds the rate that zeroes the discounted cash flows for purchases on different dates', () => {
    const flows: CashFlow[] = [
      { date: d('2023-01-02'), amount: -10000 },
      { date: d('2024-06-14'), amount: -5000 },
      { date: d('2026-10-09'), amount: 19500 },
    ];
    const rate = xirrPercent(flows);
    expect(rate).not.toBeNull();
    const r = (rate ?? 0) / 100;
    const npv = flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + r, diffDays(d('2023-01-02'), f.date) / 365), 0);
    expect(Math.abs(npv)).toBeLessThan(0.01);
  });

  it('handles losses', () => {
    const rate = xirrPercent([
      { date: d('2024-10-01'), amount: -1000 },
      { date: d('2026-10-01'), amount: 810 },
    ]);
    expect(rate).toBeCloseTo(-10, 1); // 0.9² = 0.81
  });

  it('is null without money both in and out', () => {
    expect(xirrPercent([])).toBeNull();
    expect(xirrPercent([{ date: d('2024-01-01'), amount: -1000 }])).toBeNull();
    expect(
      xirrPercent([
        { date: d('2024-01-01'), amount: 1000 },
        { date: d('2025-01-01'), amount: 1000 },
      ]),
    ).toBeNull();
  });
});
