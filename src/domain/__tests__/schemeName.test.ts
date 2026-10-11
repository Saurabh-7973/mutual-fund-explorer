import { describe, expect, it } from '@jest/globals';

import { describeScheme, optionFromIsins } from '../schemeName';

describe('describeScheme', () => {
  it('splits the usual "Fund - Plan - Option" form', () => {
    expect(describeScheme('Parag Parikh Flexi Cap Fund - Direct Plan - Growth')).toEqual({
      title: 'Parag Parikh Flexi Cap Fund',
      variant: 'Direct Plan - Growth',
      plan: 'Direct',
      option: 'Growth',
    });
  });

  it('treats the pre-2021 word "Dividend" as IDCW', () => {
    expect(describeScheme('HDFC Balanced Fund - Dividend Option')).toMatchObject({ plan: null, option: 'IDCW' });
    expect(describeScheme('Aditya Birla Sun Life Liquid Fund - Regular Plan - Daily IDCW')).toMatchObject({
      plan: 'Regular',
      option: 'IDCW',
    });
  });

  it('does not mislabel fund names that contain plan or option words', () => {
    expect(describeScheme('ICICI Prudential Dividend Yield Equity Fund - Direct Plan - Growth')).toMatchObject({
      plan: 'Direct',
      option: 'Growth',
    });
    expect(describeScheme('ICICI Prudential Regular Savings Fund - Direct Plan - Growth')).toMatchObject({
      plan: 'Direct',
    });
  });

  it('leaves unknown parts empty instead of guessing', () => {
    expect(describeScheme('Parag Parikh Dynamic Asset Allocation Fund')).toEqual({
      title: 'Parag Parikh Dynamic Asset Allocation Fund',
      variant: '',
      plan: null,
      option: null,
    });
  });

  it('falls back to the whole name when there is no spaced separator', () => {
    expect(describeScheme('Grindlays Super Saver Income Fund-GSSIF-Half Yearly Dividend').option).toBe('IDCW');
  });
});

describe('optionFromIsins', () => {
  it('reads IDCW or Growth when only one ISIN is published (real PPFAS DAAF plans)', () => {
    expect(optionFromIsins(null, 'INF879O01258')).toBe('IDCW');
    expect(optionFromIsins('INF879O01027', null)).toBe('Growth');
  });

  it('stays unknown with both or neither', () => {
    expect(optionFromIsins('INF879O01027', 'INF879O01258')).toBeNull();
    expect(optionFromIsins(null, null)).toBeNull();
  });
});
