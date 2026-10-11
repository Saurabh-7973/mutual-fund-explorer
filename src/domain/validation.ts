import { UNITS_SCALE, parseScaled, toPlainString } from './decimal';
import { formatDate } from './dates';
import { GAP_WARNING_DAYS, type PurchaseNavResolution } from './nav';

/** Holding-form rules. Messages are user-facing copy, kept here so they are tested. */

export const MAX_UNIT_DECIMALS = 4;
/** One billion units: far beyond any real folio, but catches pasted garbage. */
const MAX_UNITS_SCALED = 1_000_000_000n * 10_000n;

export type UnitsCheck =
  | { ok: true; normalized: string; scaled: bigint }
  | { ok: false; error: string };

export function validateUnits(raw: string): UnitsCheck {
  const text = raw.trim();
  if (text === '') return { ok: false, error: 'Enter the number of units.' };
  if (text.startsWith('-')) return { ok: false, error: 'Units must be greater than zero.' };
  if (text.includes(',')) return { ok: false, error: 'Enter digits only, without commas (for example 1254.321).' };
  if (!/^\d*\.?\d*$/.test(text) || text === '.') {
    return { ok: false, error: 'Enter a number such as 125.432.' };
  }

  const withLeadingZero = text.startsWith('.') ? `0${text}` : text;
  const canonicalInput = withLeadingZero.endsWith('.') ? withLeadingZero.slice(0, -1) : withLeadingZero;
  const fraction = canonicalInput.split('.')[1] ?? '';
  if (fraction.length > MAX_UNIT_DECIMALS) {
    return { ok: false, error: `Units can have at most ${MAX_UNIT_DECIMALS} decimal places.` };
  }

  const scaled = parseScaled(canonicalInput, UNITS_SCALE);
  if (scaled === null) return { ok: false, error: 'Enter a number such as 125.432.' };
  if (scaled === 0n) return { ok: false, error: 'Units must be greater than zero.' };
  if (scaled > MAX_UNITS_SCALED) return { ok: false, error: 'That is more units than any real folio holds. Check the number.' };

  return { ok: true, normalized: toPlainString(scaled, UNITS_SCALE), scaled };
}

export type Tone = 'error' | 'warning' | 'info';

/** Explains how the purchase date will be priced, or why it can't be. */
export function describePurchaseDate(resolution: PurchaseNavResolution): { tone: Tone; text: string } {
  switch (resolution.kind) {
    case 'future':
      return { tone: 'error', text: `The purchase date can't be after today (${formatDate(resolution.today)}, India time).` };
    case 'no-data':
      return { tone: 'error', text: 'This scheme has no NAV history yet, so a purchase can’t be valued.' };
    case 'before-first':
      return {
        tone: 'error',
        text: `The earliest NAV available for this scheme is ${formatDate(resolution.firstDate)}. Choose that date or later.`,
      };
    case 'pending':
      return {
        tone: 'info',
        text: `No NAV is published for this date yet (latest: ${formatDate(resolution.lastDate)}). The holding will be saved as “Awaiting NAV” and valued once it appears.`,
      };
    case 'matched': {
      const navDate = formatDate(resolution.point.date);
      if (resolution.gapDays === 0) return { tone: 'info', text: `Priced at the NAV of ${navDate}.` };
      if (resolution.gapDays > GAP_WARNING_DAYS) {
        return {
          tone: 'warning',
          text: `The next NAV in the data is ${navDate}, ${resolution.gapDays} days later. The history may have a gap; check your date.`,
        };
      }
      return { tone: 'info', text: `No NAV on that day, so the next one applies: ${navDate}.` };
    }
  }
}

/** A SIP amount: whole rupees, as SIP mandates are set. */
export const MIN_SIP_AMOUNT = 100;
export const MAX_SIP_AMOUNT = 10_00_000;

export type SipAmountCheck = { ok: true; rupees: number } | { ok: false; error: string };

export function validateSipAmount(raw: string): SipAmountCheck {
  const text = raw.trim().replace(/^₹\s*/, '');
  if (text === '') return { ok: false, error: 'Enter the monthly amount.' };
  if (text.includes(',')) return { ok: false, error: 'Enter digits only, without commas (for example 5000).' };
  if (!/^\d+$/.test(text)) return { ok: false, error: 'Enter whole rupees, such as 5000.' };
  const rupees = Number(text);
  if (rupees < MIN_SIP_AMOUNT) return { ok: false, error: `A SIP is at least ₹${MIN_SIP_AMOUNT} a month.` };
  if (rupees > MAX_SIP_AMOUNT) return { ok: false, error: 'That is more than ₹10 lakh a month. Check the amount.' };
  return { ok: true, rupees };
}

/**
 * The optional "Amount paid" of a single purchase, copied from the statement. Empty is
 * fine (the holding then counts units × NAV as invested); otherwise rupees with up to 2
 * decimals.
 */
export const MAX_AMOUNT_DECIMALS = 2;
/** ₹100 crore: beyond any one purchase in a personal folio, but catches pasted garbage. */
const MAX_AMOUNT_PAISE = 100_00_00_000n * 100n;

export type AmountCheck = { ok: true; normalized: string | null } | { ok: false; error: string };

export function validateAmountPaid(raw: string): AmountCheck {
  const text = raw.trim().replace(/^₹\s*/, '');
  if (text === '') return { ok: true, normalized: null };
  if (text.startsWith('-')) return { ok: false, error: 'The amount must be greater than zero.' };
  if (text.includes(',')) return { ok: false, error: 'Enter digits only, without commas (for example 9390.91).' };
  if (!/^\d*\.?\d*$/.test(text) || text === '.') return { ok: false, error: 'Enter an amount such as 9390.91.' };
  const canonical = (text.startsWith('.') ? `0${text}` : text).replace(/\.$/, '');
  if ((canonical.split('.')[1] ?? '').length > MAX_AMOUNT_DECIMALS) {
    return { ok: false, error: 'Rupees can have at most 2 decimal places (paise).' };
  }
  const paise = parseScaled(canonical, MAX_AMOUNT_DECIMALS);
  if (paise === null) return { ok: false, error: 'Enter an amount such as 9390.91.' };
  if (paise === 0n) return { ok: false, error: 'The amount must be greater than zero.' };
  if (paise > MAX_AMOUNT_PAISE) return { ok: false, error: 'That is more than ₹100 crore. Check the amount.' };
  return { ok: true, normalized: toPlainString(paise, MAX_AMOUNT_DECIMALS) };
}

/** How far the amount paid may sit from units × NAV before the form asks you to check it. */
export const AMOUNT_MISMATCH_PERCENT = 2n;

/**
 * Whether an amount paid and units × NAV (both at the same scale) differ by more than
 * stamp duty and rounding could explain: usually a typo in one of the two.
 */
export function amountLooksOff(paid: bigint, unitsTimesNav: bigint): boolean {
  if (paid <= 0n || unitsTimesNav <= 0n) return false;
  const diff = paid > unitsTimesNav ? paid - unitsTimesNav : unitsTimesNav - paid;
  return diff * 100n > unitsTimesNav * AMOUNT_MISMATCH_PERCENT;
}
