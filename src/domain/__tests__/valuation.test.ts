import { describe, expect, it } from '@jest/globals';

import { VALUE_SCALE } from '../decimal';
import { MINUS, formatInr, formatPercentHundredths } from '../format';
import { evaluateLot, summarize, valueLot, type LotValuation } from '../valuation';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;
const inr = (value: bigint, mode: 'negative-only' | 'always' = 'negative-only') => formatInr(value, VALUE_SCALE, mode);

function mustValue(input: Parameters<typeof valueLot>[0]): LotValuation {
  const result = valueLot(input);
  if (result === null) throw new Error('expected a valuation');
  return result;
}

describe('valueLot', () => {
  it('values a real PPFAS lot exactly (bought on the 31 Mar 2024 NAV)', () => {
    const lot = mustValue({
      units: '125.432',
      appliedNav: '74.86850',
      appliedDate: d('2024-03-31'),
      latestNav: '88.92580',
      latestDate: d('2026-10-09'),
    });
    expect(inr(lot.invested)).toBe('₹9,390.91'); // 125.432 × 74.8685 = 9,390.905692
    expect(inr(lot.current)).toBe('₹11,154.14'); // 125.432 × 88.9258 = 11,154.1409456
    expect(inr(lot.gain, 'always')).toBe('+₹1,763.24');
    expect(formatPercentHundredths(lot.returnHundredths)).toBe('+18.78%');
    expect(lot.heldDays).toBe(922);
    expect(lot.cagrPercent).not.toBeNull();
    expect(lot.cagrPercent ?? 0).toBeGreaterThan(7.0);
    expect(lot.cagrPercent ?? 0).toBeLessThan(7.1);
  });

  it('shows losses with a true minus and no CAGR under a year', () => {
    const lot = mustValue({
      units: '10',
      appliedNav: '100',
      appliedDate: d('2026-01-01'),
      latestNav: '90',
      latestDate: d('2026-10-09'),
    });
    expect(inr(lot.invested)).toBe('₹1,000.00');
    expect(inr(lot.current)).toBe('₹900.00');
    expect(inr(lot.gain, 'always')).toBe(`${MINUS}₹100.00`);
    expect(formatPercentHundredths(lot.returnHundredths)).toBe(`${MINUS}10.00%`);
    expect(lot.cagrPercent).toBeNull();
  });

  it('shows a flat lot as zero, unsigned', () => {
    const lot = mustValue({
      units: '3',
      appliedNav: '50',
      appliedDate: d('2026-01-01'),
      latestNav: '50',
      latestDate: d('2026-10-09'),
    });
    expect(inr(lot.gain, 'always')).toBe('₹0.00');
    expect(formatPercentHundredths(lot.returnHundredths)).toBe('0.00%');
  });

  it('refuses unusable inputs instead of producing NaN', () => {
    const base = { appliedDate: d('2026-01-01'), latestDate: d('2026-10-09') };
    expect(valueLot({ ...base, units: '0', appliedNav: '10', latestNav: '11' })).toBeNull();
    expect(valueLot({ ...base, units: '1', appliedNav: 'abc', latestNav: '11' })).toBeNull();
    expect(valueLot({ ...base, units: '1', appliedNav: '10', latestNav: '0' })).toBeNull();
  });
});

describe('evaluateLot', () => {
  const applied = { navDate: d('2024-03-31'), nav: '74.86850' };
  const latest: NavPoint = { date: d('2026-10-09'), nav: '88.92580', value: 88.9258 };

  it('values a priced lot against the latest NAV', () => {
    const result = evaluateLot({ units: '125.432', applied }, latest);
    expect(result.status).toBe('valued');
    if (result.status === 'valued') expect(inr(result.valuation.current)).toBe('₹11,154.14');
  });

  it('keeps "Awaiting NAV" lots and unloaded NAVs out of the valuation', () => {
    expect(evaluateLot({ units: '1', applied: null }, latest)).toEqual({ status: 'pending' });
    expect(evaluateLot({ units: '1', applied }, undefined)).toEqual({ status: 'unavailable' });
    expect(evaluateLot({ units: '1', applied }, null)).toEqual({ status: 'unavailable' });
    expect(evaluateLot({ units: 'garbage', applied }, latest)).toEqual({ status: 'unavailable' });
  });

  it('never values below the applied NAV date when the cached latest NAV is older', () => {
    const stale: NavPoint = { date: d('2024-01-02'), nav: '60.00000', value: 60 };
    const result = evaluateLot({ units: '10', applied }, stale);
    expect(result.status).toBe('valued');
    if (result.status === 'valued') {
      expect(result.valuation.gain).toBe(0n);
      expect(result.valuation.latestDate).toBe('2024-03-31');
    }
  });
});

describe('summarize', () => {
  it('sums exact values before rounding (two ₹1.005 lots total ₹2.01, not ₹2.02)', () => {
    const lot = mustValue({
      units: '1',
      appliedNav: '1',
      appliedDate: d('2026-01-01'),
      latestNav: '1.005',
      latestDate: d('2026-10-09'),
    });
    expect(inr(lot.current)).toBe('₹1.01');
    const totals = summarize([
      { status: 'valued', valuation: lot },
      { status: 'valued', valuation: lot },
    ]);
    expect(inr(totals.current)).toBe('₹2.01');
  });

  it('counts lots it could not value and reports NAV date spread', () => {
    const a = mustValue({ units: '1', appliedNav: '10', appliedDate: d('2026-01-01'), latestNav: '11', latestDate: d('2026-10-08') });
    const b = mustValue({ units: '2', appliedNav: '10', appliedDate: d('2026-01-01'), latestNav: '9', latestDate: d('2026-10-09') });
    const totals = summarize([
      { status: 'valued', valuation: a },
      { status: 'valued', valuation: b },
      { status: 'pending' },
      { status: 'unavailable' },
    ]);
    expect(totals.valuedCount).toBe(2);
    expect(totals.pendingCount).toBe(1);
    expect(totals.unavailableCount).toBe(1);
    expect(inr(totals.invested)).toBe('₹30.00');
    expect(inr(totals.current)).toBe('₹29.00');
    expect(formatPercentHundredths(totals.returnHundredths ?? 0n)).toBe(`${MINUS}3.33%`);
    expect(totals.oldestNavDate).toBe('2026-10-08');
    expect(totals.newestNavDate).toBe('2026-10-09');
  });

  it('has no return when nothing could be valued', () => {
    expect(summarize([{ status: 'pending' }]).returnHundredths).toBeNull();
  });
});
