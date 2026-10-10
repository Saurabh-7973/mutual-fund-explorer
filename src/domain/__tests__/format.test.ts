import { describe, expect, it } from '@jest/globals';

import { NAV_SCALE, parseScaled } from '../decimal';
import {
  MINUS,
  formatInr,
  formatInrCompact,
  formatNav,
  formatNavChange,
  formatPercent,
  formatPercentHundredths,
  formatUnits,
  groupIndian,
} from '../format';

describe('groupIndian', () => {
  it('groups the last three digits, then pairs', () => {
    expect(groupIndian('0')).toBe('0');
    expect(groupIndian('999')).toBe('999');
    expect(groupIndian('1000')).toBe('1,000');
    expect(groupIndian('100000')).toBe('1,00,000');
    expect(groupIndian('12345678')).toBe('1,23,45,678');
    expect(groupIndian('1234567890')).toBe('1,23,45,67,890');
  });
});

describe('formatInr', () => {
  it('formats rupees to the paisa with Indian grouping', () => {
    expect(formatInr(12_345_678n, 2)).toBe('₹1,23,456.78');
    expect(formatInr(0n, 2)).toBe('₹0.00');
  });

  it('marks losses with a true minus and gains with a plus when asked', () => {
    expect(formatInr(-98_725n, 2)).toBe(`${MINUS}₹987.25`);
    expect(formatInr(123_450n, 2, 'always')).toBe('+₹1,234.50');
    expect(formatInr(0n, 2, 'always')).toBe('₹0.00');
  });

  it('rounds half away from zero, once, at display', () => {
    expect(formatInr(123_455n, 3)).toBe('₹123.46');
    expect(formatInr(-123_455n, 3)).toBe(`${MINUS}₹123.46`);
    expect(formatInr(-4n, 3)).toBe('₹0.00');
  });
});

describe('formatInrCompact', () => {
  it('uses lakh and crore for large amounts', () => {
    expect(formatInrCompact(12_345_678_900n, 2)).toBe('₹12.35 Cr');
    expect(formatInrCompact(123_456_700n, 2)).toBe('₹12.35 L');
    expect(formatInrCompact(-1_000_000_000n, 2)).toBe(`${MINUS}₹1.00 Cr`);
  });

  it('keeps the full form below one lakh', () => {
    expect(formatInrCompact(9_999_999n, 2)).toBe('₹99,999.99');
  });

  it('never shows "100.00 L": rounding up moves to crore', () => {
    expect(formatInrCompact(999_960_000n, 2)).toBe('₹1.00 Cr'); // ₹99,99,600
    expect(formatInrCompact(999_940_000n, 2)).toBe('₹99.99 L'); // ₹99,99,400
  });
});

describe('NAV formatting', () => {
  it('shows four decimals, as AMCs compute NAV', () => {
    expect(formatNav('88.92580')).toBe('₹88.9258');
    expect(formatNav('1234.56785')).toBe('₹1,234.5679');
    expect(formatNav('N.A.')).toBe('N.A.');
  });

  it('formats NAV movements with a sign', () => {
    const latest = parseScaled('88.92580', NAV_SCALE);
    const previous = parseScaled('87.65550', NAV_SCALE);
    expect(latest !== null && previous !== null ? formatNavChange(latest - previous) : null).toBe('+₹1.2703');
    expect(latest !== null && previous !== null ? formatNavChange(previous - latest) : null).toBe(`${MINUS}₹1.2703`);
  });
});

describe('units and percentages', () => {
  it('formats units with Indian grouping and no trailing zeros', () => {
    expect(formatUnits(12_543_210n)).toBe('1,254.321');
    expect(formatUnits(10_000n)).toBe('1');
    expect(formatUnits(1_234_567_890_000n)).toBe('12,34,56,789');
  });

  it('formats exact and float percentages with signs', () => {
    expect(formatPercentHundredths(1_234n)).toBe('+12.34%');
    expect(formatPercentHundredths(-310n)).toBe(`${MINUS}3.10%`);
    expect(formatPercentHundredths(0n)).toBe('0.00%');
    expect(formatPercent(12.3456)).toBe('+12.35%');
    expect(formatPercent(-3.1)).toBe(`${MINUS}3.10%`);
    expect(formatPercent(0.001)).toBe('0.00%');
    expect(formatPercent(Number.NaN)).toBe('—');
  });
});
