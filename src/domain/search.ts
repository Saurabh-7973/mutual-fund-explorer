import { describeScheme } from './schemeName';

/** Search rules, kept out of the screen so they are tested. */

/**
 * mfapi search matches whole words, not parts of words ("parag" finds 15 schemes,
 * "par" finds none), so a short query can't be a prefix of a longer name. Two
 * characters is the shortest useful query: fund houses such as "JM" (JM Financial)
 * are two letters. A single letter returns nothing.
 */
export const MIN_QUERY_LENGTH = 2;

export interface SearchSuggestion {
  label: string;
  query: string;
  /** One line on what the collection holds, in plain words. */
  blurb: string;
}

/**
 * Starting points before the user types, themed like a broker's fund "baskets".
 * Each one only runs a search: no hard-coded scheme codes that go stale, and no return claims.
 */
export const SEARCH_SUGGESTIONS: readonly SearchSuggestion[] = [
  { label: 'Parag Parikh', query: 'parag parikh', blurb: 'Value investing, at home and abroad' },
  { label: 'Flexi cap', query: 'flexi cap', blurb: 'Any company size, one fund' },
  { label: 'Nifty 50 index', query: 'nifty 50 index', blurb: "India's 50 largest companies" },
  { label: 'Tax saver (ELSS)', query: 'elss', blurb: 'Tax deduction, 3-year lock-in' },
  { label: 'Liquid', query: 'liquid', blurb: 'Parking money for days or weeks' },
  { label: 'Gold', query: 'gold', blurb: 'Gold without a locker' },
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

/** Plan and option order inside one fund: the usual choice for a self-directed investor first. */
const VARIANT_RANK: Record<string, number> = {
  'Direct|Growth': 0,
  'Direct|IDCW': 1,
  'Direct|null': 2,
  'Regular|Growth': 3,
  'Regular|IDCW': 4,
  'Regular|null': 5,
};

/**
 * Search results with each fund's plans grouped and ordered Direct Growth first. Funds
 * keep mfapi's relevance order (by where each title first appears); only the variants
 * of one fund are reordered, so "Parag Parikh Flexi Cap" stays where search put it.
 */
export function rankSearchResults<T extends { schemeName: string }>(items: readonly T[]): T[] {
  const firstSeen = new Map<string, number>();
  const keyed = items.map((item, index) => {
    const { title, plan, option } = describeScheme(item.schemeName);
    const group = title.toLowerCase();
    if (!firstSeen.has(group)) firstSeen.set(group, index);
    return { item, index, group, rank: VARIANT_RANK[`${plan}|${option}`] ?? 6 };
  });
  keyed.sort(
    (a, b) =>
      (firstSeen.get(a.group) ?? 0) - (firstSeen.get(b.group) ?? 0) || a.rank - b.rank || a.index - b.index,
  );
  return keyed.map((entry) => entry.item);
}
