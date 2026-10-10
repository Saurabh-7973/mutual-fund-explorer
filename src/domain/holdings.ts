import { describeScheme } from './schemeName';
import type { IsoDate } from './types';

/**
 * Holdings list order: by fund title (A to Z, ignoring case), then plan/option
 * text, then purchase date (oldest first), so all lots of one fund sit together.
 */
export function sortLots<T extends { schemeName: string; purchaseDate: IsoDate }>(lots: readonly T[]): T[] {
  const keyed = lots.map((lot) => {
    const { title, variant } = describeScheme(lot.schemeName);
    return { lot, title: title.toLowerCase(), variant: variant.toLowerCase() };
  });
  keyed.sort((a, b) => {
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    if (a.variant !== b.variant) return a.variant < b.variant ? -1 : 1;
    if (a.lot.purchaseDate !== b.lot.purchaseDate) return a.lot.purchaseDate < b.lot.purchaseDate ? -1 : 1;
    return 0;
  });
  return keyed.map((entry) => entry.lot);
}
