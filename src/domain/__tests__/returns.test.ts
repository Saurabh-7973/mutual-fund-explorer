import { describe, expect, it } from '@jest/globals';

import { headlineReturn, pointToPointReturn, trailingReturns } from '../returns';
import type { IsoDate, NavPoint } from '../types';

const p = (date: string, nav: string): NavPoint => ({ date: date as IsoDate, nav, value: Number(nav) });

describe('pointToPointReturn', () => {
  it('is absolute below one year', () => {
    const result = pointToPointReturn(p('2025-01-01', '100'), p('2025-07-01', '110'));
    expect(result?.kind).toBe('absolute');
    expect(result?.percent).toBeCloseTo(10, 8);
  });

  it('is annualised (CAGR) from one year: +21% over two years is 10% a year', () => {
    const result = pointToPointReturn(p('2021-01-01', '100'), p('2023-01-01', '121'));
    expect(result?.kind).toBe('annualised');
    expect(result?.percent).toBeCloseTo(10, 8);
  });

  it('switches at exactly 365 days', () => {
    expect(pointToPointReturn(p('2025-01-01', '100'), p('2025-12-31', '110'))?.kind).toBe('absolute');
    expect(pointToPointReturn(p('2025-01-01', '100'), p('2026-01-01', '110'))?.kind).toBe('annualised');
  });

  it('refuses zero-length periods', () => {
    expect(pointToPointReturn(p('2025-01-01', '100'), p('2025-01-01', '100'))).toBeNull();
  });
});

describe('trailingReturns', () => {
  const series = [
    p('2024-10-08', '100'),
    p('2025-10-08', '110'),
    p('2026-04-08', '115'),
    p('2026-09-07', '120'),
    p('2026-10-08', '121'),
  ];
  const byKey = Object.fromEntries(trailingReturns(series).map((r) => [r.key, r]));

  it('uses the NAV in force on each start date', () => {
    expect(byKey['1M']?.startDate).toBe('2026-09-07');
    expect(byKey['1M']?.kind).toBe('absolute');
    expect(byKey['1M']?.percent).toBeCloseTo((121 / 120 - 1) * 100, 8);
    expect(byKey['6M']?.percent).toBeCloseTo((121 / 115 - 1) * 100, 8);
  });

  it('annualises one year and longer', () => {
    expect(byKey['1Y']?.kind).toBe('annualised');
    expect(byKey['1Y']?.percent).toBeCloseTo(10, 8);
    expect(byKey['ALL']?.percent).toBeCloseTo(10, 8);
  });

  it('leaves periods empty when the history is too short', () => {
    expect(byKey['3Y']?.percent).toBeNull();
    expect(byKey['5Y']?.percent).toBeNull();
  });

  it('returns empty rows for an empty series', () => {
    expect(trailingReturns([]).every((r) => r.percent === null)).toBe(true);
  });
});

describe('headlineReturn', () => {
  const row = (key: string, percent: number | null) => ({
    key,
    label: key,
    kind: 'annualised' as const,
    percent,
    startDate: null,
    endDate: null,
  });

  it('prefers 3 years, then 1 year, then since start', () => {
    expect(headlineReturn([row('1Y', 5), row('3Y', 12), row('ALL', 15)])?.key).toBe('3Y');
    expect(headlineReturn([row('1Y', 5), row('3Y', null), row('ALL', 15)])?.key).toBe('1Y');
    expect(headlineReturn([row('1Y', null), row('3Y', null), row('ALL', 15)])?.key).toBe('ALL');
    expect(headlineReturn([row('ALL', null)])).toBeNull();
  });
});
