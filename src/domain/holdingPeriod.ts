import { addDays, addMonths } from './dates';
import { UNITS_SCALE, parseScaled } from './decimal';
import type { IsoDate } from './types';

/**
 * How long each purchase has been held, for the two dates a long-term investor plans
 * around:
 *  - ELSS (tax-saving) funds lock every purchase for 3 years from its allotment.
 *  - Units of an equity scheme held for more than 12 months count as long-term for
 *    capital gains tax.
 * Only schemes AMFI files as "Equity Scheme" are treated as equity here: fund of funds,
 * index funds and hybrids are taxed by rules this data can't tell apart, so the app says
 * nothing about them rather than something wrong. No tax is worked out.
 */

export const ELSS_LOCK_IN_MONTHS = 36;
export const LONG_TERM_MONTHS = 12;

export function isElss(category: string | null, schemeName: string): boolean {
  return /\belss\b/i.test(category ?? '') || /\b(elss|tax saver)\b/i.test(schemeName);
}

export function isEquityScheme(category: string | null): boolean {
  // AMFI writes both "Equity Scheme - …" and "Equity Schemes - ELSS- Tax Saver Fund".
  return /^\s*equity schemes?\b/i.test(category ?? '');
}

/** The day an ELSS purchase's 3-year lock-in ends. */
export function lockInEndsOn(purchaseDate: IsoDate): IsoDate {
  return addMonths(purchaseDate, ELSS_LOCK_IN_MONTHS);
}

/** The first day a purchase has been held for more than 12 months. */
export function longTermFrom(purchaseDate: IsoDate): IsoDate {
  return addDays(addMonths(purchaseDate, LONG_TERM_MONTHS), 1);
}

export interface PeriodLot {
  units: string;
  purchaseDate: IsoDate;
  /** The NAV the purchase was priced at; its date is the allotment date. */
  applied: { navDate: IsoDate } | null;
}

/**
 * Lock-in and holding periods run from allotment, which is the date of the NAV the units
 * were bought at (a purchase on a holiday is allotted on the next business day).
 */
export function allotmentDate(lot: Pick<PeriodLot, 'purchaseDate' | 'applied'>): IsoDate {
  return lot.applied?.navDate ?? lot.purchaseDate;
}

export interface UnitsUntil {
  /** Units at UNITS_SCALE still waiting for their date. */
  units: bigint;
  count: number;
  /** The soonest date one of them gets there, and the date the last one does. */
  next: IsoDate;
  all: IsoDate;
}

function waiting(
  lots: readonly PeriodLot[],
  dateOf: (purchase: IsoDate) => IsoDate,
  today: IsoDate,
): UnitsUntil | null {
  let units = 0n;
  let count = 0;
  let next: IsoDate | null = null;
  let all: IsoDate | null = null;
  for (const lot of lots) {
    const date = dateOf(allotmentDate(lot));
    if (date <= today) continue;
    units += parseScaled(lot.units, UNITS_SCALE) ?? 0n;
    count += 1;
    if (next === null || date < next) next = date;
    if (all === null || date > all) all = date;
  }
  return next === null || all === null ? null : { units, count, next, all };
}

export interface HoldingPeriods {
  /** ELSS units still in their lock-in, or null (not ELSS, or all free). */
  locked: UnitsUntil | null;
  /**
   * Equity units held 12 months or less, or null (not an equity scheme, or all long-term).
   * Always null for ELSS: its lock-in outlasts 12 months, so the lock-in is the date that matters.
   */
  shortTerm: UnitsUntil | null;
}

export function holdingPeriods(
  lots: readonly PeriodLot[],
  category: string | null,
  schemeName: string,
  today: IsoDate,
): HoldingPeriods {
  if (isElss(category, schemeName)) return { locked: waiting(lots, lockInEndsOn, today), shortTerm: null };
  return { locked: null, shortTerm: isEquityScheme(category) ? waiting(lots, longTermFrom, today) : null };
}
