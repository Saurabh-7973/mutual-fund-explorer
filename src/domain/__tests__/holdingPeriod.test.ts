import { describe, expect, it } from '@jest/globals';

import { allotmentDate, holdingPeriods, isElss, isEquityScheme, lockInEndsOn, longTermFrom } from '../holdingPeriod';
import type { IsoDate } from '../types';

const d = (value: string) => value as IsoDate;
const ELSS_CATEGORY = 'Equity Scheme - ELSS';
const FLEXI = 'Equity Scheme - Flexi Cap Fund';

describe('dates', () => {
  it('ends an ELSS lock-in 3 years after the purchase', () => {
    expect(lockInEndsOn(d('2023-01-15'))).toBe('2026-01-15');
  });

  it('counts a purchase as long-term from the day after 12 months', () => {
    expect(longTermFrom(d('2025-10-11'))).toBe('2026-10-12');
    // Month-end purchases follow addMonths' clamping.
    expect(longTermFrom(d('2024-02-29'))).toBe('2025-03-01');
  });
});

describe('which schemes', () => {
  it('spots ELSS by category or name', () => {
    expect(isElss(ELSS_CATEGORY, 'Axis ELSS Tax Saver Fund')).toBe(true);
    expect(isElss(null, 'Mirae Asset Tax Saver Fund - Direct Plan - Growth')).toBe(true);
    expect(isElss('Equity Schemes - ELSS- Tax Saver Fund', 'Mirae Asset ELSS Tax Saver Fund')).toBe(true);
    expect(isElss(FLEXI, 'Parag Parikh Flexi Cap Fund')).toBe(false);
  });

  it('treats only AMFI equity schemes as equity, not index funds or FoFs', () => {
    expect(isEquityScheme(FLEXI)).toBe(true);
    expect(isEquityScheme('Equity Schemes - ELSS- Tax Saver Fund')).toBe(true);
    expect(isEquityScheme('Other Scheme - Index Funds')).toBe(false);
    expect(isEquityScheme('Other Scheme - FoF Overseas')).toBe(false);
    expect(isEquityScheme('Hybrid Scheme - Aggressive Hybrid Fund')).toBe(false);
    expect(isEquityScheme(null)).toBe(false);
  });
});

describe('allotmentDate', () => {
  it('is the date of the NAV applied, else the purchase date', () => {
    expect(allotmentDate({ purchaseDate: d('2024-06-09'), applied: { navDate: d('2024-06-10') } })).toBe('2024-06-10');
    expect(allotmentDate({ purchaseDate: d('2024-06-09'), applied: null })).toBe('2024-06-09');
  });
});

describe('holdingPeriods', () => {
  const lots = [
    { units: '100', purchaseDate: d('2023-01-15'), applied: null },
    // Ordered on a Sunday, allotted at Monday's NAV.
    { units: '50.5', purchaseDate: d('2024-06-09'), applied: { navDate: d('2024-06-10') } },
    { units: '20', purchaseDate: d('2026-03-10'), applied: null },
  ];

  it('sums ELSS units still locked, with the next and last unlock dates', () => {
    const { locked, shortTerm } = holdingPeriods(lots, ELSS_CATEGORY, 'Axis ELSS Tax Saver Fund', d('2026-10-11'));
    expect(locked).toEqual({ units: 705_000n, count: 2, next: d('2027-06-10'), all: d('2029-03-10') });
    // The lock-in outlasts 12 months, so ELSS shows no separate short-term line.
    expect(shortTerm).toBeNull();
  });

  it('sums equity units held a year or less, with when they turn long-term', () => {
    const { locked, shortTerm } = holdingPeriods(lots, FLEXI, 'Parag Parikh Flexi Cap Fund', d('2026-10-11'));
    expect(locked).toBeNull();
    expect(shortTerm).toEqual({ units: 200_000n, count: 1, next: d('2027-03-11'), all: d('2027-03-11') });
  });

  it('is null once every purchase is past its date', () => {
    const { locked, shortTerm } = holdingPeriods(lots, ELSS_CATEGORY, 'Axis ELSS', d('2029-03-10'));
    expect(locked).toBeNull();
    expect(shortTerm).toBeNull();
  });

  it('says nothing for schemes it cannot classify', () => {
    expect(holdingPeriods(lots, 'Other Scheme - Index Funds', 'UTI Nifty 50 Index Fund', d('2026-10-11'))).toEqual({
      locked: null,
      shortTerm: null,
    });
  });
});
