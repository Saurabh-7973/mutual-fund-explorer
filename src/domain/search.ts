import { describeScheme } from './schemeName';

/** Search rules, kept out of the screen so they are tested. */

/** mfapi search is a substring match; under 3 characters it returns noise. */
export const MIN_QUERY_LENGTH = 3;

export interface SearchSuggestion {
  label: string;
  query: string;
}

/**
 * Starting points before the user types, themed like a broker's fund "baskets".
 * Each one only runs a search: no hard-coded scheme codes that go stale, and no return claims.
 */
export const SEARCH_SUGGESTIONS: readonly SearchSuggestion[] = [
  { label: 'Parag Parikh', query: 'parag parikh' },
  { label: 'Flexi cap', query: 'flexi cap' },
  { label: 'Nifty 50 index', query: 'nifty 50 index' },
  { label: 'Tax saver (ELSS)', query: 'elss' },
  { label: 'Liquid', query: 'liquid' },
  { label: 'Gold', query: 'gold' },
];

/** Trims, collapses spaces and lowercases, so "  Parag  Parikh" and "parag parikh" share one cache entry. */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isSearchable(normalized: string): boolean {
  return normalized.length >= MIN_QUERY_LENGTH;
}

export interface SchemeFilters {
  directOnly: boolean;
  growthOnly: boolean;
}

/** Client-side filters on parsed scheme names. Names without a plan or option drop out when a filter is on. */
export function filterSchemes<T extends { schemeName: string }>(items: readonly T[], filters: SchemeFilters): T[] {
  if (!filters.directOnly && !filters.growthOnly) return [...items];
  return items.filter((item) => {
    const label = describeScheme(item.schemeName);
    return (!filters.directOnly || label.plan === 'Direct') && (!filters.growthOnly || label.option === 'Growth');
  });
}

/** Route params arrive as strings (or arrays). A scheme code is a positive integer of up to 9 digits. */
export function parseSchemeCode(value: string | readonly string[] | undefined): number | null {
  const raw = (typeof value === 'string' ? value : value?.[0])?.trim();
  if (raw === undefined || !/^\d{1,9}$/.test(raw)) return null;
  const code = Number(raw);
  return code > 0 ? code : null;
}

/** Typing a scheme code (4 to 9 digits) offers a direct "Open scheme" row, since name search can't find codes. */
export function schemeCodeInQuery(normalized: string): number | null {
  return /^\d{4,9}$/.test(normalized) ? parseSchemeCode(normalized) : null;
}

/** mfapi.in returns at most 15 search results (checked live in Phase 0). */
export const SEARCH_RESULT_CAP = 15;

/** A full page of results means there may be more matches the API didn't return. */
export function mayBeTruncated(resultCount: number): boolean {
  return resultCount >= SEARCH_RESULT_CAP;
}
