import { describe, expect, it } from '@jest/globals';

import { amountLooksOff, describePurchaseDate, validateAmountPaid, validateSipAmount, validateUnits } from '../validation';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;
const point = (date: string, nav: string): NavPoint => ({ date: d(date), nav, value: Number(nav) });

function error(raw: string): string | null {
  const result = validateUnits(raw);
  return result.ok ? null : result.error;
}

describe('validateUnits', () => {
  it('accepts positive decimals and normalises them', () => {
    expect(validateUnits(' 125.4320 ')).toEqual({ ok: true, normalized: '125.432', scaled: 1_254_320n });
    expect(validateUnits('.5')).toMatchObject({ ok: true, normalized: '0.5' });
    expect(validateUnits('5.')).toMatchObject({ ok: true, normalized: '5' });
    expect(validateUnits('00012.5')).toMatchObject({ ok: true, normalized: '12.5' });
  });

  it('explains each kind of bad input', () => {
    expect(error('')).toBe('Enter the number of units.');
    expect(error('0')).toBe('Units must be greater than zero.');
    expect(error('0.0000')).toBe('Units must be greater than zero.');
    expect(error('-5')).toBe('Units must be greater than zero.');
    expect(error('1.23456')).toBe('Units can have at most 4 decimal places.');
    expect(error('1,254.3')).toContain('without commas');
    expect(error('1..2')).toBe('Enter a number such as 125.432.');
    expect(error('1e3')).toBe('Enter a number such as 125.432.');
    expect(error('abc')).toBe('Enter a number such as 125.432.');
    expect(error('.')).toBe('Enter a number such as 125.432.');
    expect(error('1000000001')).toContain('more units than any real folio');
  });
});

describe('describePurchaseDate', () => {
  it('uses an error tone for dates that cannot be saved', () => {
    expect(describePurchaseDate({ kind: 'future', today: d('2026-10-10') }).tone).toBe('error');
    expect(describePurchaseDate({ kind: 'no-data' }).tone).toBe('error');
    const early = describePurchaseDate({ kind: 'before-first', firstDate: d('2013-05-28') });
    expect(early.tone).toBe('error');
    expect(early.text).toContain('28 May 2013');
  });

  it('explains pending lots and next-NAV pricing', () => {
    expect(describePurchaseDate({ kind: 'pending', lastDate: d('2026-10-08') }).text).toContain('Awaiting NAV');
    expect(
      describePurchaseDate({ kind: 'matched', gapDays: 0, point: point('2026-10-05', '88.76200') }).text,
    ).toBe('Priced at the NAV of 05 Oct 2026.');
    expect(
      describePurchaseDate({ kind: 'matched', gapDays: 3, point: point('2026-10-05', '88.76200') }).text,
    ).toContain('next one applies');
  });

  it('warns when the next NAV is suspiciously far away', () => {
    const gap = describePurchaseDate({ kind: 'matched', gapDays: 12, point: point('2026-01-20', '11') });
    expect(gap.tone).toBe('warning');
    expect(gap.text).toContain('12 days later');
  });
});

describe('validateSipAmount', () => {
  const error = (raw: string) => {
    const check = validateSipAmount(raw);
    return check.ok ? null : check.error;
  };
  it('accepts whole rupees, with or without a ₹ sign', () => {
    expect(validateSipAmount(' 5000 ')).toEqual({ ok: true, rupees: 5000 });
    expect(validateSipAmount('₹ 2500')).toEqual({ ok: true, rupees: 2500 });
  });
  it('explains what is wrong', () => {
    expect(error('')).toBe('Enter the monthly amount.');
    expect(error('5,000')).toBe('Enter digits only, without commas (for example 5000).');
    expect(error('500.50')).toBe('Enter whole rupees, such as 5000.');
    expect(error('50')).toBe('A SIP is at least ₹100 a month.');
    expect(error('2000000')).toBe('That is more than ₹10 lakh a month. Check the amount.');
  });
});

describe('validateAmountPaid', () => {
  it('accepts empty (optional) and rupees with up to 2 decimals', () => {
    expect(validateAmountPaid('')).toEqual({ ok: true, normalized: null });
    expect(validateAmountPaid(' 9390.91 ')).toEqual({ ok: true, normalized: '9390.91' });
    expect(validateAmountPaid('₹5000.00')).toEqual({ ok: true, normalized: '5000' });
    expect(validateAmountPaid('.5')).toEqual({ ok: true, normalized: '0.5' });
  });

  it('explains what is wrong', () => {
    expect(validateAmountPaid('9,390.91')).toMatchObject({ ok: false, error: expect.stringContaining('without commas') });
    expect(validateAmountPaid('12.345')).toMatchObject({ ok: false, error: expect.stringContaining('2 decimal') });
    expect(validateAmountPaid('0')).toMatchObject({ ok: false, error: expect.stringContaining('greater than zero') });
    expect(validateAmountPaid('-5')).toMatchObject({ ok: false });
    expect(validateAmountPaid('abc')).toMatchObject({ ok: false });
    expect(validateAmountPaid('99999999999')).toMatchObject({ ok: false, error: expect.stringContaining('crore') });
  });
});

describe('amountLooksOff', () => {
  it('allows stamp duty and rounding, flags a likely typo', () => {
    expect(amountLooksOff(100_000n, 99_995n)).toBe(false);
    expect(amountLooksOff(100_000n, 98_100n)).toBe(false);
    expect(amountLooksOff(100_000n, 90_000n)).toBe(true);
    expect(amountLooksOff(1_000_000n, 100_000n)).toBe(true);
    expect(amountLooksOff(0n, 100n)).toBe(false);
  });
});
