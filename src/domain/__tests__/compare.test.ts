import { describe, expect, it } from '@jest/globals';

import { comparisonCovers, compareGrowth, GROWTH_BASE } from '../compare';
import type { IsoDate, NavPoint } from '../types';

const p = (date: string, value: number): NavPoint => ({ date: date as IsoDate, nav: String(value), value });

describe('compareGrowth', () => {
  const a = [p('2020-01-01', 10), p('2021-01-01', 12), p('2022-01-01', 15), p('2023-01-01', 20)];
  const b = [p('2021-01-01', 100), p('2022-01-01', 90), p('2023-01-01', 130)];

  it('starts both at ₹10,000 on the first date both histories cover', () => {
    const growth = compareGrowth(a, b, null);
    expect(growth?.start).toBe('2021-01-01');
    expect(growth?.points[0]).toEqual({ date: '2021-01-01', a: GROWTH_BASE, b: GROWTH_BASE });
    const last = growth?.points[growth.points.length - 1];
    expect(last?.a).toBeCloseTo((20 / 12) * GROWTH_BASE, 6);
    expect(last?.b).toBeCloseTo(1.3 * GROWTH_BASE, 6);
    expect(growth?.endA).toBe(1_666_667n); // ₹16,666.67
    expect(growth?.endB).toBe(1_300_000n); // ₹13,000.00
  });

  it('honours a range ending at the earlier latest NAV', () => {
    const growth = compareGrowth(a, b, 12);
    expect(growth?.start).toBe('2022-01-01');
    expect(growth?.end).toBe('2023-01-01');
  });

  it('is null without overlap', () => {
    expect(compareGrowth([p('2020-01-01', 1)], [p('2021-01-01', 1)], null)).toBeNull();
    expect(compareGrowth([], b, null)).toBeNull();
  });

  it('says whether both histories reach back over a range', () => {
    expect(comparisonCovers(a, b, 12)).toBe(true);
    expect(comparisonCovers(a, b, 36)).toBe(false);
    expect(comparisonCovers(a, b, null)).toBe(true);
  });
});
