/**
 * Exact decimal arithmetic on scaled integers (BigInt).
 *
 * A value is a pair (integer, scale): 88.9258 at scale 8 is 8892580000n.
 * Units × NAV is computed exactly, and rounding happens once, at display.
 * Values stored in state or caches stay strings, because JSON cannot hold BigInt.
 */

/** NAVs: mfapi publishes 5 decimals and AMCs compute 4, so 8 leaves headroom without rounding. */
export const NAV_SCALE = 8;
/** Units: AMCs allot 3 or 4 decimals. */
export const UNITS_SCALE = 4;
/** Units × NAV keeps every digit. */
export const VALUE_SCALE = NAV_SCALE + UNITS_SCALE;

const PLAIN_DECIMAL = /^(\d+)(?:\.(\d+))?$/;

const POWERS_OF_TEN: bigint[] = [];

/**
 * 10^exponent as a BigInt. Built from a string rather than with `**`, so no
 * Babel exponentiation transform (Math.pow) can ever receive a BigInt.
 */
export function pow10(exponent: number): bigint {
  if (!Number.isInteger(exponent) || exponent < 0) throw new RangeError(`Invalid exponent: ${exponent}`);
  let power = POWERS_OF_TEN[exponent];
  if (power === undefined) {
    power = BigInt(`1${'0'.repeat(exponent)}`);
    POWERS_OF_TEN[exponent] = power;
  }
  return power;
}

/**
 * Parses a plain non-negative decimal ("88.92580", "125", "0.5") into an integer
 * scaled by 10^scale. Returns null when the text is not a plain decimal, or when it
 * carries more significant fraction digits than `scale` (never rounds silently).
 */
export function parseScaled(input: string, scale: number): bigint | null {
  const match = PLAIN_DECIMAL.exec(input);
  if (!match) return null;
  const whole = match[1] ?? '0';
  const fraction = match[2] ?? '';
  if (fraction.length > scale && !/^0+$/.test(fraction.slice(scale))) return null;
  const kept = fraction.slice(0, scale).padEnd(scale, '0');
  return BigInt(whole + kept);
}

/** Integer division rounding half away from zero, so gains and losses round symmetrically. */
export function divRound(numerator: bigint, divisor: bigint): bigint {
  if (divisor === 0n) throw new RangeError('Division by zero');
  const negative = numerator < 0n !== divisor < 0n;
  const a = numerator < 0n ? -numerator : numerator;
  const b = divisor < 0n ? -divisor : divisor;
  const quotient = a / b;
  const remainder = a % b;
  const rounded = remainder * 2n >= b ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/** Moves a scaled value to another scale, rounding half away from zero when precision drops. */
export function rescale(value: bigint, fromScale: number, toScale: number): bigint {
  if (toScale >= fromScale) return value * pow10(toScale - fromScale);
  return divRound(value, pow10(fromScale - toScale));
}

/** Exact decimal text with trailing zeros removed: (12543210n, 4) → "1254.321". */
export function toPlainString(value: bigint, scale: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const whole = scale > 0 ? digits.slice(0, -scale) : digits;
  const fraction = scale > 0 ? digits.slice(-scale).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Float view of a scaled value, for ratios and charts only. */
export function toNumber(value: bigint, scale: number): number {
  return Number(value) / 10 ** scale;
}
