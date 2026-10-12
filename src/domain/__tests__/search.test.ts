import { describe, expect, it } from '@jest/globals';

import { SEARCH_PARAG_PARIKH } from '../../api/__fixtures__/mfapi';
import {
  filterSchemes,
  isSearchable,
  mayBeTruncated,
  normalizeQuery,
  parseSchemeCode,
  rankSearchResults,
  schemeCodeInQuery,
  otherPlans,
} from '../search';

describe('normalizeQuery', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(normalizeQuery('  Parag   Parikh ')).toBe('parag parikh');
    expect(normalizeQuery('\tNIFTY 50\n')).toBe('nifty 50');
  });

  it('starts searching from two characters, so two-letter fund houses such as JM work', () => {
    expect(isSearchable(normalizeQuery(' j '))).toBe(false);
    expect(isSearchable(normalizeQuery(' JM '))).toBe(true);
    expect(isSearchable(normalizeQuery('hdfc'))).toBe(true);
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

describe('mayBeTruncated', () => {
  it('flags a full page of 15 results only', () => {
    expect(mayBeTruncated(15)).toBe(true);
    expect(mayBeTruncated(14)).toBe(false);
    expect(mayBeTruncated(0)).toBe(false);
  });
});

describe('rankSearchResults', () => {
  const names = (items: { schemeName: string }[]) => items.map((i) => i.schemeName);
  it('keeps funds in search order and puts Direct Growth first within each fund', () => {
    const ranked = rankSearchResults([
      { schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth' },
      { schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
      { schemeName: 'Parag Parikh Liquid Fund - Regular Plan - IDCW' },
      { schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - IDCW' },
      { schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Growth' },
    ]);
    expect(names(ranked)).toEqual([
      'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
      'Parag Parikh Flexi Cap Fund - Direct Plan - IDCW',
      'Parag Parikh Flexi Cap Fund - Regular Plan - Growth',
      'Parag Parikh Liquid Fund - Direct Plan - Growth',
      'Parag Parikh Liquid Fund - Regular Plan - IDCW',
    ]);
  });
});

describe('otherPlans', () => {
  const results = [
    { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
    { schemeCode: 122640, schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth' },
    { schemeCode: 153964, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - IDCW' },
    { schemeCode: 143269, schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Growth' },
    { schemeCode: 153965, schemeName: 'PARAG PARIKH FLEXI CAP FUND - REGULAR PLAN - IDCW' },
  ];

  it('lists only the same scheme’s other plans, Direct Growth first, case aside', () => {
    const others = otherPlans(results, 122640, 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth');
    expect(others.map((item) => item.schemeCode)).toEqual([122639, 153964, 153965]);
  });

  it('is empty when the scheme has no other plan in the results', () => {
    expect(otherPlans(results, 143269, 'Parag Parikh Liquid Fund - Direct Plan - Growth')).toEqual([]);
  });
});
