import { describe, expect, it } from '@jest/globals';

import { assetClassOf } from '../assetClass';

describe('assetClassOf', () => {
  it('reads AMFI categories as captured from mfapi.in', () => {
    expect(assetClassOf('Equity Scheme - Flexi Cap Fund', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth')).toBe(
      'Equity',
    );
    expect(assetClassOf('Equity Scheme - Mid Cap Fund', 'Motilal Oswal Midcap Fund')).toBe('Equity');
    expect(
      assetClassOf(
        'Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage',
        'Parag Parikh Dynamic Asset Allocation Fund',
      ),
    ).toBe('Hybrid');
    expect(assetClassOf('Income/Debt Oriented Schemes - Banking and PSU Debt Fund', 'Some Banking & PSU Fund')).toBe(
      'Debt',
    );
    expect(assetClassOf('Debt Scheme - Liquid Fund', 'Parag Parikh Liquid Fund - Direct Plan - Growth')).toBe('Debt');
    expect(assetClassOf('Income', 'HDFC Balanced Fund - Dividend Option')).toBe('Debt');
  });

  it('uses the name for index funds, ETFs and fund of funds filed under "Other"', () => {
    expect(assetClassOf('Other Scheme - Index Funds', 'UTI Nifty 50 Index Fund - Direct Plan - Growth')).toBe('Equity');
    expect(assetClassOf('Other Scheme - FoF Domestic', 'SBI Gold Fund - Direct Plan - Growth')).toBe('Gold & silver');
    expect(assetClassOf('Other Scheme - Index Funds', 'Bharat Bond ETF FOF - April 2030')).toBe('Debt');
    expect(assetClassOf(null, 'Nippon India Silver ETF FoF Direct-Growth')).toBe('Gold & silver');
  });

  it('says Other rather than guess', () => {
    expect(assetClassOf('Solution Oriented Scheme - Retirement Fund', 'Some Retirement Plan')).toBe('Other');
    expect(assetClassOf(null, 'Mystery Scheme')).toBe('Other');
  });
});
