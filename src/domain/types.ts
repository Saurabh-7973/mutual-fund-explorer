/**
 * Shared domain types. Everything in src/domain is pure TypeScript:
 * no React, no React Native, no network. That keeps the money and date
 * rules unit-testable and lets them run identically in Jest and on Hermes.
 */

/** A calendar date as "YYYY-MM-DD". ISO dates sort and compare correctly as strings. */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

/** One published NAV observation. */
export interface NavPoint {
  date: IsoDate;
  /** NAV exactly as published, e.g. "88.92580". Money maths always starts from this string. */
  nav: string;
  /** Float copy of `nav`, used only for charts and ratios, never for rupee amounts. */
  value: number;
}

export interface SchemeMeta {
  schemeCode: number;
  schemeName: string;
  fundHouse: string | null;
  schemeType: string | null;
  schemeCategory: string | null;
  isinGrowth: string | null;
  isinDivReinvestment: string | null;
}

/** A validated NAV series: ascending by date, one point per date. */
export interface NavHistory {
  meta: SchemeMeta;
  points: NavPoint[];
  /** Rows dropped while parsing (malformed date or NAV, or a duplicate date). */
  skipped: number;
}

export interface SchemeSearchResult {
  schemeCode: number;
  schemeName: string;
}

/** The NAV a purchase was priced at: the first NAV on or after its date. */
export interface AppliedNav {
  navDate: IsoDate;
  /** NAV string exactly as published. */
  nav: string;
}
