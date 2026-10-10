import { NAV_SCALE, parseScaled } from '../domain/decimal';
import { parseApiDate } from '../domain/dates';
import { buildSeries } from '../domain/nav';
import type { NavHistory, NavPoint, SchemeMeta, SchemeSearchResult } from '../domain/types';
import { ApiError } from './errors';

/**
 * Runtime validation of mfapi.in responses. Input is `unknown` until proven otherwise.
 *
 * Verified live on 10 Oct 2026:
 *  - search returns [{ schemeCode: number, schemeName: string }]
 *  - /mf/{code} and /mf/{code}/latest return { meta, data: [{ date: "DD-MM-YYYY", nav: "88.92580" }], status }
 *  - an unknown code returns HTTP 200 with status "SUCCESS", scheme_code 0, empty strings and data: []
 * Bad rows are skipped and counted; a response with no usable rows is an error.
 */

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toSchemeCode(value: unknown): number | null {
  const code = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return typeof code === 'number' && Number.isInteger(code) && code > 0 ? code : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function parseSearchResponse(json: unknown): SchemeSearchResult[] {
  if (!Array.isArray(json)) throw new ApiError('bad_data', 'Search response is not a list');
  const seen = new Set<number>();
  const results: SchemeSearchResult[] = [];
  for (const item of json) {
    if (!isObject(item)) continue;
    const schemeCode = toSchemeCode(item.schemeCode);
    const schemeName = optionalText(item.schemeName);
    if (schemeCode === null || schemeName === null || seen.has(schemeCode)) continue;
    seen.add(schemeCode);
    results.push({ schemeCode, schemeName });
  }
  return results;
}

/** Parses one { date, nav } row; null when either part is unusable. */
export function parseNavRow(row: unknown): NavPoint | null {
  if (!isObject(row) || typeof row.date !== 'string' || typeof row.nav !== 'string') return null;
  const date = parseApiDate(row.date);
  const nav = row.nav.trim();
  const scaled = parseScaled(nav, NAV_SCALE);
  const value = Number(nav);
  if (date === null || scaled === null || scaled <= 0n || !Number.isFinite(value)) return null;
  return { date, nav, value };
}

/** Parses /mf/{code} and /mf/{code}/latest. */
export function parseSchemeResponse(json: unknown, requestedCode: number): NavHistory {
  if (!isObject(json) || !isObject(json.meta) || !Array.isArray(json.data)) {
    throw new ApiError('bad_data', 'Scheme response is missing meta or data');
  }
  const meta = json.meta;
  const code = toSchemeCode(meta.scheme_code);
  const name = optionalText(meta.scheme_name);

  // mfapi answers an unknown code with 200, scheme_code 0 and empty fields.
  if (code === null && name === null && json.data.length === 0) {
    throw new ApiError('not_found', `No scheme with code ${requestedCode}`);
  }

  const parsedMeta: SchemeMeta = {
    schemeCode: code ?? requestedCode,
    schemeName: name ?? `Scheme ${requestedCode}`,
    fundHouse: optionalText(meta.fund_house),
    schemeType: optionalText(meta.scheme_type),
    schemeCategory: optionalText(meta.scheme_category),
    isinGrowth: optionalText(meta.isin_growth),
    isinDivReinvestment: optionalText(meta.isin_div_reinvestment),
  };

  const rows: NavPoint[] = [];
  let invalid = 0;
  for (const raw of json.data) {
    const row = parseNavRow(raw);
    if (row === null) invalid++;
    else rows.push(row);
  }
  if (json.data.length > 0 && rows.length === 0) {
    throw new ApiError('bad_data', 'No usable NAV rows in response');
  }

  const { points, duplicates } = buildSeries(rows);
  return { meta: parsedMeta, points, skipped: invalid + duplicates };
}
