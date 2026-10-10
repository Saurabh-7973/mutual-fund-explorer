import { describe, expect, it } from '@jest/globals';

import { NAV_SCALE, UNITS_SCALE, divRound, parseScaled, pow10, rescale, toPlainString } from '../decimal';

describe('pow10', () => {
  it('builds exact powers of ten', () => {
    expect(pow10(0)).toBe(1n);
    expect(pow10(2)).toBe(100n);
    expect(pow10(12)).toBe(1_000_000_000_000n);
    expect(pow10(12)).toBe(pow10(12));
  });

  it('rejects negative and fractional exponents', () => {
    expect(() => pow10(-1)).toThrow(RangeError);
    expect(() => pow10(1.5)).toThrow(RangeError);
  });
});

describe('parseScaled', () => {
  it('parses NAV and unit strings exactly', () => {
    expect(parseScaled('88.92580', NAV_SCALE)).toBe(8_892_580_000n);
    expect(parseScaled('125', UNITS_SCALE)).toBe(1_250_000n);
    expect(parseScaled('0.5', UNITS_SCALE)).toBe(5_000n);
  });

  it('refuses to round away significant digits', () => {
    expect(parseScaled('1.23456', UNITS_SCALE)).toBeNull();
    expect(parseScaled('1.23450', UNITS_SCALE)).toBe(12_345n);
  });

  it('rejects anything that is not a plain non-negative decimal', () => {
    for (const bad of ['', '-1', '1e3', '.5', '1.', '1..2', 'NaN', 'Infinity', ' 1', 'N.A.']) {
      expect(parseScaled(bad, UNITS_SCALE)).toBeNull();
    }
  });

  it('adds without floating-point drift', () => {
    const a = parseScaled('0.1', NAV_SCALE);
    const b = parseScaled('0.2', NAV_SCALE);
    expect(a !== null && b !== null ? a + b : null).toBe(parseScaled('0.3', NAV_SCALE));
  });
});

describe('divRound (half away from zero)', () => {
  it('rounds halves away from zero symmetrically', () => {
    expect(divRound(5n, 2n)).toBe(3n);
    expect(divRound(-5n, 2n)).toBe(-3n);
    expect(divRound(7n, -2n)).toBe(-4n);
    expect(divRound(4n, 3n)).toBe(1n);
  });

  it('refuses division by zero', () => {
    expect(() => divRound(1n, 0n)).toThrow(RangeError);
  });
});

describe('rescale', () => {
  it('rounds when reducing precision and pads when increasing it', () => {
    expect(rescale(12_345n, 4, 2)).toBe(123n);
    expect(rescale(12_355n, 4, 2)).toBe(124n);
    expect(rescale(-12_355n, 4, 2)).toBe(-124n);
    expect(rescale(123n, 2, 4)).toBe(12_300n);
  });
});

describe('toPlainString', () => {
  it('prints exact decimals without trailing zeros', () => {
    expect(toPlainString(12_543_210n, 4)).toBe('1254.321');
    expect(toPlainString(10_000n, 4)).toBe('1');
    expect(toPlainString(5n, 4)).toBe('0.0005');
    expect(toPlainString(-12_345n, 2)).toBe('-123.45');
  });
});
