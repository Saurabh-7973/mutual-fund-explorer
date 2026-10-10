import { describe, expect, it } from '@jest/globals';

import { SEARCH_PARAG_PARIKH } from '../../api/__fixtures__/mfapi';
import { filterSchemes, isSearchable, normalizeQuery, parseSchemeCode, schemeCodeInQuery } from '../search';

describe('normalizeQuery', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(normalizeQuery('  Parag   Parikh ')).toBe('parag parikh');
    expect(normalizeQuery('\tNIFTY 50\n')).toBe('nifty 50');
  });

  it('starts searching from three characters', () => {
    expect(isSearchable(normalizeQuery(' hd '))).toBe(false);
    expect(isSearchable(normalizeQuery('hdf'))).toBe(true);
  });
});

describe('filterSchemes', () => {
  const codes = (items: readonly { schemeCode: number }[]) => items.map((item) => item.schemeCode);

  it('returns everything when no filter is on', () => {
    expect(filterSchemes(SEARCH_PARAG_PARIKH, { directOnly: false, growthOnly: false })).toHaveLength(15);
  });

  it('keeps Direct plans, or Direct Growth plans, from the real search results', () => {
    expect(codes(filterSchemes(SEARCH_PARAG_PARIKH, { directOnly: true, growthOnly: true }))).toEqual([
      122639, 147481, 143269,
    ]);
    expect(filterSchemes(SEARCH_PARAG_PARIKH, { directOnly: true, growthOnly: false })).toHaveLength(7);
  });

  it('drops names that state no plan when filtering by plan', () => {
    const names = codes(filterSchemes(SEARCH_PARAG_PARIKH, { directOnly: false, growthOnly: true }));
    expect(names).not.toContain(152469); // "Parag Parikh Dynamic Asset Allocation Fund"
    expect(names).toHaveLength(6);
  });
});

describe('scheme codes', () => {
  it('parses route params defensively', () => {
    expect(parseSchemeCode('122639')).toBe(122639);
    expect(parseSchemeCode(' 122639 ')).toBe(122639);
    expect(parseSchemeCode(['100121', 'x'])).toBe(100121);
    expect(parseSchemeCode('0')).toBeNull();
    expect(parseSchemeCode('12a')).toBeNull();
    expect(parseSchemeCode('-5')).toBeNull();
    expect(parseSchemeCode('1234567890')).toBeNull();
    expect(parseSchemeCode(undefined)).toBeNull();
    expect(parseSchemeCode([])).toBeNull();
  });

  it('offers to open a scheme when the search text is a code', () => {
    expect(schemeCodeInQuery('122639')).toBe(122639);
    expect(schemeCodeInQuery('123')).toBeNull();
    expect(schemeCodeInQuery('nifty 50')).toBeNull();
  });
});
