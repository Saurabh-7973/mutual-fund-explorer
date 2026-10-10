import { describe, expect, it } from '@jest/globals';

import {
  HISTORY_PPFAS_FLEXI_DIRECT,
  LATEST_CLOSED_SCHEME,
  LATEST_PPFAS_FLEXI_DIRECT,
  SEARCH_PARAG_PARIKH,
  UNKNOWN_SCHEME,
} from '../__fixtures__/mfapi';
import { ApiError } from '../errors';
import { parseNavRow, parseSchemeResponse, parseSearchResponse } from '../parse';

/** The ApiError kind a call throws, or null when it doesn't throw. */
function thrownKind(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof ApiError ? error.kind : 'not-an-ApiError';
  }
}

describe('parseSearchResponse', () => {
  it('reads the real search payload', () => {
    const results = parseSearchResponse(SEARCH_PARAG_PARIKH);
    expect(results).toHaveLength(15);
    expect(results[1]).toEqual({
      schemeCode: 122639,
      schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    });
  });

  it('skips bad items, accepts numeric-string codes and drops duplicates', () => {
    const results = parseSearchResponse([
      { schemeCode: '122639', schemeName: '  Parag Parikh Flexi Cap Fund - Direct Plan - Growth ' },
      { schemeCode: 122639, schemeName: 'Duplicate code' },
      { schemeCode: 0, schemeName: 'Zero code' },
      { schemeCode: 1.5, schemeName: 'Fractional code' },
      { schemeCode: 123, schemeName: '' },
      { schemeName: 'No code' },
      null,
      'text',
      [1, 2],
    ]);
    expect(results).toEqual([
      { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
    ]);
  });

  it('accepts an empty result list', () => {
    expect(parseSearchResponse([])).toEqual([]);
  });

  it('rejects anything that is not a list', () => {
    expect(thrownKind(() => parseSearchResponse({ status: 'ERROR' }))).toBe('bad_data');
    expect(thrownKind(() => parseSearchResponse(null))).toBe('bad_data');
    expect(thrownKind(() => parseSearchResponse('<html>Bad gateway</html>'))).toBe('bad_data');
  });
});

describe('parseNavRow', () => {
  it('converts DD-MM-YYYY and keeps the NAV text exactly as published', () => {
    expect(parseNavRow({ date: '09-10-2026', nav: '88.92580' })).toEqual({
      date: '2026-10-09',
      nav: '88.92580',
      value: 88.9258,
    });
  });

  it('rejects rows that would corrupt the series', () => {
    expect(parseNavRow({ date: '31-02-2024', nav: '10.0' })).toBeNull(); // impossible date
    expect(parseNavRow({ date: '2026-10-09', nav: '10.0' })).toBeNull(); // wrong date format
    expect(parseNavRow({ date: '09-10-2026', nav: '0.00000' })).toBeNull(); // zero NAV
    expect(parseNavRow({ date: '09-10-2026', nav: 'N.A.' })).toBeNull();
    expect(parseNavRow({ date: '09-10-2026', nav: '' })).toBeNull();
    expect(parseNavRow({ date: '09-10-2026', nav: 88.9258 })).toBeNull(); // number, not text
    expect(parseNavRow({ date: '09-10-2026' })).toBeNull();
    expect(parseNavRow(null)).toBeNull();
  });
});

describe('parseSchemeResponse', () => {
  it('reads the real history (newest first) and returns it oldest first', () => {
    const history = parseSchemeResponse(HISTORY_PPFAS_FLEXI_DIRECT, 122639);
    expect(history.meta).toEqual({
      schemeCode: 122639,
      schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
      fundHouse: 'PPFAS Mutual Fund',
      schemeType: 'Open Ended Schemes',
      schemeCategory: 'Equity Scheme - Flexi Cap Fund',
      isinGrowth: 'INF879O01027',
      isinDivReinvestment: null,
    });
    expect(history.points).toHaveLength(14);
    expect(history.points[0]?.date).toBe('2023-08-11');
    expect(history.points.at(-1)).toEqual({ date: '2026-10-08', nav: '87.65550', value: 87.6555 });
    expect(history.skipped).toBe(0);
  });

  it('reads /latest for a live scheme and for a closed one', () => {
    expect(parseSchemeResponse(LATEST_PPFAS_FLEXI_DIRECT, 122639).points).toEqual([
      { date: '2026-10-09', nav: '88.92580', value: 88.9258 },
    ]);
    const closed = parseSchemeResponse(LATEST_CLOSED_SCHEME, 100121);
    expect(closed.points[0]?.date).toBe('2018-06-01');
    expect(closed.meta.isinGrowth).toBeNull();
  });

  it('turns mfapi’s "HTTP 200, SUCCESS, empty fields" answer for an unknown code into not_found', () => {
    expect(thrownKind(() => parseSchemeResponse(UNKNOWN_SCHEME, 99_999_999))).toBe('not_found');
  });

  it('skips and counts malformed and duplicate rows', () => {
    const result = parseSchemeResponse(
      {
        meta: LATEST_PPFAS_FLEXI_DIRECT.meta,
        data: [
          { date: '09-10-2026', nav: '88.92580' },
          { date: '09-10-2026', nav: '88.00000' }, // same date again: the first one listed wins
          { date: '31-02-2026', nav: '88.1' },
          { date: '08-10-2026', nav: '' },
          { date: '08-10-2026', nav: '87.65550' },
        ],
        status: 'SUCCESS',
      },
      122639,
    );
    expect(result.points.map((point) => [point.date, point.nav])).toEqual([
      ['2026-10-08', '87.65550'],
      ['2026-10-09', '88.92580'],
    ]);
    expect(result.skipped).toBe(3);
  });

  it('keeps a real scheme that has published no NAV yet', () => {
    const result = parseSchemeResponse(
      {
        meta: { ...LATEST_PPFAS_FLEXI_DIRECT.meta, scheme_code: 999_001, scheme_name: 'New Fund - Direct Plan - Growth' },
        data: [],
        status: 'SUCCESS',
      },
      999_001,
    );
    expect(result.points).toEqual([]);
    expect(result.meta.schemeName).toBe('New Fund - Direct Plan - Growth');
  });

  it('fills in missing meta from the requested code instead of failing', () => {
    const result = parseSchemeResponse({ meta: { scheme_code: 0, scheme_name: '' }, data: [{ date: '09-10-2026', nav: '10.5' }] }, 4242);
    expect(result.meta.schemeCode).toBe(4242);
    expect(result.meta.schemeName).toBe('Scheme 4242');
    expect(result.meta.fundHouse).toBeNull();
  });

  it('rejects payloads without meta or data, or with no usable rows at all', () => {
    expect(thrownKind(() => parseSchemeResponse({ data: [] }, 1))).toBe('bad_data');
    expect(thrownKind(() => parseSchemeResponse({ meta: {}, data: 'x' }, 1))).toBe('bad_data');
    expect(thrownKind(() => parseSchemeResponse('<html>', 1))).toBe('bad_data');
    expect(
      thrownKind(() => parseSchemeResponse({ meta: LATEST_PPFAS_FLEXI_DIRECT.meta, data: [{ date: 'x', nav: 'y' }] }, 122639)),
    ).toBe('bad_data');
  });
});
