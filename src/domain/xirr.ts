import { diffDays } from './dates';
import type { IsoDate } from './types';

/**
 * XIRR: the one annual rate that makes the value of every cash flow, discounted to
 * the first one, add up to zero. It is the honest return for money invested on
 * different dates; for a single purchase it equals that purchase's CAGR.
 *
 * Rates are floats by nature (fractional powers), like CAGR. Rupee amounts reach
 * this function as float views of exact values and never flow back into money.
 */

export interface CashFlow {
  date: IsoDate;
  /** Negative for money in (a purchase), positive for money out (today's value). */
  amount: number;
}

const DAYS_PER_YEAR = 365;

/** Each flow's amount and its time from the first flow in years, worked out once per solve. */
interface Timed {
  amount: number;
  years: number;
}

function npv(rate: number, flows: readonly Timed[]): number {
  let total = 0;
  for (const flow of flows) total += flow.amount / Math.pow(1 + rate, flow.years);
  return total;
}

/** Annual rate as a percentage (12.34 = 12.34% a year), or null when there is no answer. */
export function xirrPercent(flows: readonly CashFlow[]): number | null {
  if (flows.length < 2 || !flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
  const start = flows.reduce((min, f) => (f.date < min ? f.date : min), flows[0]?.date ?? ('' as IsoDate));
  // Dates are parsed once here, not on every step of the search (a 600-purchase portfolio
  // has 1,200 flows and the search takes ~40 steps).
  const timed: Timed[] = flows.map((f) => ({ amount: f.amount, years: diffDays(start, f.date) / DAYS_PER_YEAR }));

  // Bisection on a bracket that holds any realistic fund return (−99.99% to +10,000% a year).
  // NPV falls as the rate rises when money goes in before it comes out, so the sign change is unique.
  let low = -0.9999;
  let high = 100;
  let fLow = npv(low, timed);
  const fHigh = npv(high, timed);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) return null;
  for (let i = 0; i < 200 && high - low > 1e-10; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid, timed);
    if (fMid === 0) return mid * 100;
    if (fLow * fMid < 0) high = mid;
    else {
      low = mid;
      fLow = fMid;
    }
  }
  return ((low + high) / 2) * 100;
}
