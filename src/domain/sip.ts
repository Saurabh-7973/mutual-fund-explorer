import { addMonths } from './dates';
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
export function sipGain(currentValue: bigint, plan: Pick<SipPlan, 'paid'>): { gain: bigint; returnHundredths: bigint | null } {
  const gain = currentValue - plan.paid;
  return { gain, returnHundredths: plan.paid > 0n ? divRound(gain * 10_000n, plan.paid) : null };
}
