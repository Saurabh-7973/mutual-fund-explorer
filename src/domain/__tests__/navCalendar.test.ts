import { describe, expect, it } from '@jest/globals';

import { navChange } from '../nav';
import { intensityOf, navMonth } from '../navCalendar';
import type { IsoDate, NavPoint } from '../types';

const p = (date: string, nav: string): NavPoint => ({ date: date as IsoDate, nav, value: Number(nav) });

// October 2026 starts on a Thursday. NAVs on business days, with a holiday on Fri 2 Oct.
const points = [
  p('2026-09-30', '100.0000'),
  p('2026-10-01', '101.0000'),
  p('2026-10-05', '99.0000'),
  p('2026-10-06', '99.5000'),
  p('2026-10-30', '110.0000'),
  p('2026-11-02', '111.0000'),
];

describe('navMonth', () => {
  const month = navMonth(points, 2026, 10);

  it('lays out weekdays only, Monday first, padded to the 1st', () => {
    expect(month.columns).toBe(5);
    expect(month.weeks[0]?.map((cell) => cell?.date ?? null)).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(month.weeks[1]?.[0]?.date).toBe('2026-10-05');
    expect(month.weeks.every((week) => week.length === 5)).toBe(true);
  });

  it("marks a weekday without a NAV, and takes each day's change from the previous NAV", () => {
    const friday = month.weeks[0]?.[4];
    expect(friday?.point).toBeNull();
    const monday = month.weeks[1]?.[0];
    expect(monday?.change?.from.date).toBe('2026-10-01');
    // The 1st compares with the last NAV of September.
    expect(month.weeks[0]?.[3]?.change?.from.date).toBe('2026-09-30');
  });

  it('summarises the month from the last NAV before it to the last NAV in it', () => {
    expect(month.change?.from.date).toBe('2026-09-30');
    expect(month.change?.to.date).toBe('2026-10-30');
    expect(month.high?.date).toBe('2026-10-30');
    expect(month.low?.date).toBe('2026-10-05');
    expect(month.count).toBe(4);
  });

  it('uses seven columns when a fund published on a weekend', () => {
    const withSaturday = navMonth([...points.slice(0, 2), p('2026-10-03', '101.5000'), ...points.slice(2)], 2026, 10);
    expect(withSaturday.columns).toBe(7);
    expect(withSaturday.weeks[0]?.[6]?.date).toBe('2026-10-03');
  });

  it('has no month change for the first month of data', () => {
    expect(navMonth(points, 2026, 9).change).toBeNull();
  });
});

describe('intensityOf', () => {
  it('steps up with the size of the move, either way', () => {
    const at = (nav: string) => navChange(p('2026-10-01', '100.0000'), p('2026-10-02', nav));
    expect(intensityOf(null)).toBe(0);
    expect(intensityOf(at('100.1000'))).toBe(0);
    expect(intensityOf(at('100.5000'))).toBe(1);
    expect(intensityOf(at('98.5000'))).toBe(2);
    expect(intensityOf(at('103.0000'))).toBe(3);
  });
});
