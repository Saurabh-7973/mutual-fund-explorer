import { describe, expect, it } from '@jest/globals';

import { fundHouseOf, MARK_TONES } from '../fundHouse';

describe('fundHouseOf', () => {
  it('names the house and its monogram from real scheme names, any case', () => {
    expect(fundHouseOf('Parag Parikh Flexi Cap Fund - Direct Plan - Growth')).toMatchObject({
      name: 'Parag Parikh',
      monogram: 'PP',
    });
    expect(fundHouseOf('HDFC Mid Cap Fund - Direct Plan - Growth Option').monogram).toBe('HD');
    expect(fundHouseOf('NIPPON INDIA LARGE CAP FUND - DIRECT Plan - Growth').monogram).toBe('NI');
    expect(fundHouseOf('UTI Nifty 50 Index Fund - Direct Plan - Growth').monogram).toBe('UTI');
    expect(fundHouseOf('ICICI Prudential Bluechip Fund').name).toBe('ICICI Prudential');
  });

  it('files renamed houses under their current name', () => {
    expect(fundHouseOf('Reliance Fixed Horizon Fund XXI').name).toBe('Nippon India');
    expect(fundHouseOf('IDFC Sterling Value Fund').name).toBe('Bandhan');
    expect(fundHouseOf('Birla Sun Life Frontline Equity').name).toBe('Aditya Birla Sun Life');
  });

  it('keeps Bank of India apart from Bandhan, and Quant apart from Quantum', () => {
    expect(fundHouseOf('Bank of India Small Cap Fund').monogram).toBe('BOI');
    expect(fundHouseOf('Bandhan Small Cap Fund').monogram).toBe('BD');
    expect(fundHouseOf('quant Small Cap Fund').monogram).toBe('QT');
    expect(fundHouseOf('Quantum Long Term Equity Value Fund').monogram).toBe('QM');
  });

  it('falls back to the first two initials for an unknown house', () => {
    expect(fundHouseOf('Old Mutual Something Fund').monogram).toBe('OM');
  });

  it('gives a house the same colour every time, within range', () => {
    const a = fundHouseOf('Parag Parikh Flexi Cap Fund').tone;
    expect(fundHouseOf('PARAG PARIKH LIQUID FUND').tone).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(MARK_TONES);
  });
});
