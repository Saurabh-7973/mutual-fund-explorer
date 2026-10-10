import { describe, expect, it } from '@jest/globals';

import { sortLots } from '../holdings';
import type { IsoDate } from '../types';

const lot = (id: string, schemeName: string, purchaseDate: string) => ({
  id,
  schemeName,
  purchaseDate: purchaseDate as IsoDate,
});

describe('sortLots', () => {
  it('groups by fund title, then plan, then purchase date', () => {
    const sorted = sortLots([
      lot('a', 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth', '2024-01-01'),
      lot('b', 'HDFC Balanced Fund - Dividend Option', '2018-01-01'),
      lot('c', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', '2025-06-01'),
      lot('d', 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', '2024-03-31'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('ignores case and leaves the input untouched', () => {
    const input = [lot('x', 'zeta fund', '2024-01-01'), lot('y', 'Alpha Fund', '2024-01-01')];
    expect(sortLots(input).map((item) => item.id)).toEqual(['y', 'x']);
    expect(input.map((item) => item.id)).toEqual(['x', 'y']);
  });
});
