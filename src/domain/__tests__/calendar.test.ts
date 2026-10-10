import { describe, expect, it } from '@jest/globals';

import { monthGrid, monthHasSelectable, openingMonth, shiftMonth, weekdayOf } from '../calendar';
import type { IsoDate } from '../types';

const d = (value: string) => value as IsoDate;

describe('calendar', () => {
  it('knows the weekday of real dates', () => {
    expect(weekdayOf(d('2026-10-11'))).toBe(0); // Sunday
    expect(weekdayOf(d('2024-03-31'))).toBe(0); // Sunday, the FY-end NAV day
    expect(weekdayOf(d('2023-08-15'))).toBe(2); // Tuesday, Independence Day 2023
    expect(weekdayOf(d('1969-12-31'))).toBe(3); // Wednesday, before day 0
  });

  it('lays a month out in Sunday-first weeks', () => {
    const october = monthGrid(2026, 10);
    expect(october[0]).toEqual([null, null, null, null, d('2026-10-01'), d('2026-10-02'), d('2026-10-03')]);
    expect(october.every((week) => week.length === 7)).toBe(true);
    expect(october.flat().filter((cell) => cell !== null)).toHaveLength(31);
    expect(monthGrid(2024, 2).flat().filter((cell) => cell !== null)).toHaveLength(29);
  });

  it('opens on the chosen month and steps across years', () => {
    expect(openingMonth(null, d('2026-10-11'))).toEqual({ year: 2026, month: 10 });
    expect(openingMonth(d('2024-03-31'), d('2026-10-11'))).toEqual({ year: 2024, month: 3 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2025, 12, 1)).toEqual({ year: 2026, month: 1 });
    expect(shiftMonth(2026, 10, -120)).toEqual({ year: 2016, month: 10 });
  });

  it('tells whether a month has any day in range', () => {
    expect(monthHasSelectable(2013, 4, d('2013-05-28'), d('2026-10-11'))).toBe(false);
    expect(monthHasSelectable(2013, 5, d('2013-05-28'), d('2026-10-11'))).toBe(true);
    expect(monthHasSelectable(2026, 11, null, d('2026-10-11'))).toBe(false);
  });
});
