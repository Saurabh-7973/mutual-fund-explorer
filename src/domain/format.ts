import { NAV_SCALE, UNITS_SCALE, divRound, parseScaled, rescale } from './decimal';

/**
 * Display formatting with Indian conventions, built on exact scaled integers.
 *
 * We do not rely on Intl.NumberFormat('en-IN'): its output depends on the JS
 * engine's locale data, and it would force a float conversion first. These
 * functions are deterministic everywhere and covered by unit tests.
 */

/** U+2212 MINUS SIGN: the same width as "+", so signed columns line up. */
export const MINUS = '−';

export type SignMode = 'negative-only' | 'always';

/** Groups an integer digit string the Indian way: "12345678" → "1,23,45,678". */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) groups.unshift(rest);
  return `${groups.join(',')},${lastThree}`;
}

function signFor(value: bigint, mode: SignMode): string {
  if (value < 0n) return MINUS;
  return mode === 'always' && value > 0n ? '+' : '';
}

/** Magnitude of a scaled value with exactly `decimals` fraction digits and Indian grouping. */
function formatMagnitude(value: bigint, scale: number, decimals: number): string {
  const rounded = rescale(value < 0n ? -value : value, scale, decimals);
  const digits = rounded.toString().padStart(decimals + 1, '0');
  const whole = decimals > 0 ? digits.slice(0, -decimals) : digits;
  const fraction = decimals > 0 ? `.${digits.slice(-decimals)}` : '';
  return groupIndian(whole) + fraction;
}

/** Signed number with fixed decimals: (−98725n, 2, 2) → "−987.25". */
export function formatFixed(value: bigint, scale: number, decimals: number, mode: SignMode = 'negative-only'): string {
  const rounded = rescale(value, scale, decimals);
  return signFor(rounded, mode) + formatMagnitude(value, scale, decimals);
}

/** Rupees to the paisa: "₹1,23,456.78", "−₹987.25", or "+₹1,234.50" with mode 'always'. */
export function formatInr(value: bigint, scale: number, mode: SignMode = 'negative-only'): string {
  const paise = rescale(value, scale, 2);
  return `${signFor(paise, mode)}₹${formatMagnitude(value, scale, 2)}`;
}

/**
 * Compact rupees for dense places (list rows, strips): "₹12.35 L", "₹1.23 Cr"; the full form
 * below one lakh. `mode: 'always'` puts a "+" on gains, like `formatInr`.
 */
export function formatInrCompact(value: bigint, scale: number, mode: SignMode = 'negative-only'): string {
  const paise = rescale(value, scale, 2);
  const magnitude = paise < 0n ? -paise : paise;
  const sign = signFor(paise, mode);
  const PAISE_PER_CRORE = 1_000_000_000n;
  const PAISE_PER_LAKH = 10_000_000n;
  // Lakhs to 2 decimals = paise / 10^5, rounded. 100.00 L or more reads better as crores.
  const lakhHundredths = divRound(magnitude, 100_000n);
  if (magnitude >= PAISE_PER_CRORE || lakhHundredths >= 10_000n) {
    // Crores to 2 decimals = paise / 10^7, rounded.
    return `${sign}₹${formatMagnitude(divRound(magnitude, 10_000_000n), 2, 2)} Cr`;
  }
  if (magnitude >= PAISE_PER_LAKH) {
    return `${sign}₹${formatMagnitude(lakhHundredths, 2, 2)} L`;
  }
  return `${sign}₹${formatMagnitude(magnitude, 2, 2)}`;
}

/** A NAV string as "₹88.9258" (4 decimals, as AMCs compute it). Falls back to the raw text. */
export function formatNav(nav: string): string {
  const scaled = parseScaled(nav, NAV_SCALE);
  return scaled === null ? nav : `₹${formatMagnitude(scaled, NAV_SCALE, 4)}`;
}

/** A NAV movement such as "+₹0.4321" or "−₹1.0500". */
export function formatNavChange(diff: bigint): string {
  const rounded = rescale(diff, NAV_SCALE, 4);
  return `${signFor(rounded, 'always')}₹${formatMagnitude(diff, NAV_SCALE, 4)}`;
}

/** Units with Indian grouping and up to 4 decimals, trailing zeros dropped: "1,254.321". */
export function formatUnits(units: bigint): string {
  const digits = units.toString().padStart(UNITS_SCALE + 1, '0');
  const whole = digits.slice(0, -UNITS_SCALE);
  const fraction = digits.slice(-UNITS_SCALE).replace(/0+$/, '');
  return groupIndian(whole) + (fraction ? `.${fraction}` : '');
}

/** Hundredths of a percent → "+12.34%" (exact path, used for holdings). */
export function formatPercentHundredths(hundredths: bigint, mode: SignMode = 'always'): string {
  return `${formatFixed(hundredths, 2, 2, mode)}%`;
}

/** A float percentage → "+12.34%" (for ratios such as CAGR that need fractional powers). */
export function formatPercent(percent: number, mode: SignMode = 'always'): string {
  if (!Number.isFinite(percent)) return '—';
  const rounded = Math.round(Math.abs(percent) * 100) / 100;
  const text = rounded.toFixed(2);
  if (text === '0.00') return '0.00%';
  const sign = percent < 0 ? MINUS : mode === 'always' ? '+' : '';
  return `${sign}${text}%`;
}
