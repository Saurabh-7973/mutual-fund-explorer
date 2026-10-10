import { addMonths, daysInMonth, isoParts, toIsoDate } from './dates';
import { NAV_SCALE, UNITS_SCALE, VALUE_SCALE, divRound, parseScaled, pow10, toPlainString } from './decimal';
import { resolvePurchaseNavWithLatest } from './nav';
import type { AppliedNav, IsoDate, NavPoint } from './types';

/**
 * A monthly SIP entered in one go. Each instalment date is the start date plus whole
 * months (the 31st falls back to the month's last day), and each is priced exactly like
 * a single purchase: the first NAV on or after its date. Units are the amount divided by
 * that NAV, to 4 decimals; a statement can differ in the last decimal because AMCs also
 * deduct stamp duty.
 */

export interface SipInstalment {
  purchaseDate: IsoDate;
  /** Canonical decimal string, like a typed-in purchase. */
  units: string;
  applied: AppliedNav;
}

export interface SipPlan {
  instalments: SipInstalment[];
  /** Instalment dates whose NAV isn't published yet; add them later as single purchases. */
  awaiting: IsoDate[];
  /** Why nothing can be added, when that is the case. */
  problem: 'before-first' | 'future' | 'no-data' | null;
  /**
   * Rupees paid for the included instalments (amount × count), at VALUE_SCALE. Units × NAV
   * can fall a few paise short of this because units are rounded to 4 decimals.
   */
  paid: bigint;
}

/** The longest SIP accepted in one go: 40 years of monthly instalments. */
export const MAX_SIP_INSTALMENTS = 480;

export function planSip(
  historyPoints: readonly NavPoint[],
  latest: NavPoint | null,
  amountRupees: number,
  startDate: IsoDate,
  today: IsoDate,
): SipPlan {
  const plan: SipPlan = { instalments: [], awaiting: [], problem: null, paid: 0n };
  if (!Number.isInteger(amountRupees) || amountRupees <= 0) return plan;
  const amount = BigInt(amountRupees);
  for (let i = 0; i < MAX_SIP_INSTALMENTS; i++) {
    const date = addMonths(startDate, i);
    if (date > today) break;
    const resolution = resolvePurchaseNavWithLatest(historyPoints, latest, date, today);
    if (resolution.kind === 'matched') {
      const nav = parseScaled(resolution.point.nav, NAV_SCALE);
      if (nav === null || nav <= 0n) continue;
      const units = divRound(amount * pow10(UNITS_SCALE + NAV_SCALE), nav);
      plan.paid += amount * pow10(VALUE_SCALE);
      plan.instalments.push({
        purchaseDate: date,
        units: toPlainString(units, UNITS_SCALE),
        applied: { navDate: resolution.point.date, nav: resolution.point.nav },
      });
    } else if (resolution.kind === 'pending') {
      plan.awaiting.push(date);
    } else if (i === 0) {
      plan.problem = resolution.kind;
      return plan;
    }
  }
  return plan;
}

/** What a planned SIP gained against the rupees actually paid, at VALUE_SCALE. */
export function sipGain(
  currentValue: bigint,
  plan: Pick<SipPlan, 'paid'>,
): { gain: bigint; returnHundredths: bigint | null } {
  const gain = currentValue - plan.paid;
  return { gain, returnHundredths: plan.paid > 0n ? divRound(gain * 10_000n, plan.paid) : null };
}

export interface SipPattern {
  /** Whole rupees per instalment. */
  amountRupees: number;
  /** Day of the month the instalments are dated (the start date's day). */
  dayOfMonth: number;
  lastDate: IsoDate;
  /** The next instalment date after the last one recorded. */
  nextDate: IsoDate;
}

/** Instalments needed before a pattern counts as a SIP. */
export const SIP_MIN_INSTALMENTS = 3;

/**
 * Spots a running SIP in a fund's purchases: the latest run of monthly purchases on the
 * same day of the month (the 29th–31st may fall back to a month's last day), each worth
 * the same whole-rupee amount to within a rupee (units are rounded to 4 decimals).
 * Null when there is no such run of at least three.
 */
export function detectSip(
  lots: readonly { units: string; purchaseDate: IsoDate; applied: AppliedNav | null }[],
): SipPattern | null {
  const priced = lots
    .filter((lot): lot is typeof lot & { applied: AppliedNav } => lot.applied !== null)
    .sort((a, b) => (a.purchaseDate < b.purchaseDate ? -1 : a.purchaseDate > b.purchaseDate ? 1 : 0));
  const amounts = priced.map((lot) => {
    const units = parseScaled(lot.units, UNITS_SCALE);
    const nav = parseScaled(lot.applied.nav, NAV_SCALE);
    return units === null || nav === null ? null : Number(divRound(units * nav, pow10(VALUE_SCALE)));
  });

  // Walk back from the latest purchase while each earlier one is the month before, on the
  // same day (or both on a month-end, for SIPs dated the 29th–31st).
  const end = priced.length - 1;
  const last = priced[end];
  const lastAmount = amounts[end];
  if (last === undefined || lastAmount === null || lastAmount === undefined) return null;
  const isMonthEnd = (date: IsoDate) => {
    const { year, month, day } = isoParts(date);
    return day === daysInMonth(year, month);
  };
  let start = end;
  while (start > 0) {
    const prev = priced[start - 1];
    const prevAmount = amounts[start - 1];
    const current = priced[start];
    if (prev === undefined || current === undefined || prevAmount === null || prevAmount === undefined) break;
    const a = isoParts(prev.purchaseDate);
    const b = isoParts(current.purchaseDate);
    const nextMonth = b.year * 12 + b.month - (a.year * 12 + a.month) === 1;
    const sameDay =
      a.day === b.day ||
      (a.day > b.day && isMonthEnd(current.purchaseDate)) ||
      (b.day > a.day && isMonthEnd(prev.purchaseDate));
    if (!nextMonth || !sameDay || Math.abs(prevAmount - lastAmount) > 1) break;
    start--;
  }
  if (end - start + 1 < SIP_MIN_INSTALMENTS) return null;
  const run = priced.slice(start, end + 1);
  const dayOfMonth = Math.max(...run.map((lot) => isoParts(lot.purchaseDate).day));
  const { year, month } = isoParts(last.purchaseDate);
  const next = { year: month === 12 ? year + 1 : year, month: month === 12 ? 1 : month + 1 };
  const nextDate = toIsoDate(next.year, next.month, Math.min(dayOfMonth, daysInMonth(next.year, next.month)));
  return { amountRupees: lastAmount, dayOfMonth, lastDate: last.purchaseDate, nextDate };
}
