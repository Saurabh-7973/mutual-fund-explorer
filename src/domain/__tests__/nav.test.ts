import { describe, expect, it } from '@jest/globals';

import { HISTORY_PPFAS_FLEXI_DIRECT } from '../../api/__fixtures__/mfapi';
import { parseSchemeResponse } from '../../api/parse';
import {
  GAP_WARNING_DAYS,
  buildSeries,
  isStale,
  latestChange,
  lowerBound,
  mergeLatest,
  navOnOrAfter,
  navOnOrBefore,
  navListItems,
  navRowsNewestFirst,
  rangeCovered,
  resolvePurchaseNav,
  resolvePurchaseNavWithLatest,
  sliceRange,
} from '../nav';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;
const p = (date: string, nav: string): NavPoint => ({ date: d(date), nav, value: Number(nav) });

/** Real PPFAS Flexi Cap (Direct, Growth) rows, ascending after parsing. */
const real = parseSchemeResponse(HISTORY_PPFAS_FLEXI_DIRECT, 122639).points;
const TODAY = d('2026-10-10');

describe('purchase rule: first NAV on or after the purchase date', () => {
  it('uses the same day when a NAV exists', () => {
    const result = resolvePurchaseNav(real, d('2024-03-31'), TODAY);
    expect(result).toMatchObject({ kind: 'matched', gapDays: 0, point: { date: '2024-03-31', nav: '74.86850' } });
  });

  it('moves a holiday purchase to the next NAV (Independence Day 2023)', () => {
    const result = resolvePurchaseNav(real, d('2023-08-15'), TODAY);
    expect(result).toMatchObject({ kind: 'matched', gapDays: 1, point: { date: '2023-08-16' } });
  });

  it('handles a real weekend NAV: Good Friday 2024 maps to Sunday 31 Mar', () => {
    const result = resolvePurchaseNav(real, d('2024-03-29'), TODAY);
    expect(result).toMatchObject({ kind: 'matched', gapDays: 2, point: { date: '2024-03-31' } });
  });

  it('moves a Gandhi Jayanti purchase (Fri 2 Oct 2026) to Monday', () => {
    const result = resolvePurchaseNav(real, d('2026-10-02'), TODAY);
    expect(result).toMatchObject({ kind: 'matched', gapDays: 3, point: { date: '2026-10-05' } });
  });

  it('marks a lot pending when no NAV on or after the date is published yet', () => {
    expect(resolvePurchaseNav(real, d('2026-10-09'), TODAY)).toEqual({ kind: 'pending', lastDate: '2026-10-08' });
  });

  it('rejects future dates, dates before the earliest NAV, and empty histories', () => {
    expect(resolvePurchaseNav(real, d('2026-10-11'), TODAY)).toEqual({ kind: 'future', today: '2026-10-10' });
    expect(resolvePurchaseNav(real, d('2023-08-10'), TODAY)).toEqual({ kind: 'before-first', firstDate: '2023-08-11' });
    expect(resolvePurchaseNav([], d('2026-10-01'), TODAY)).toEqual({ kind: 'no-data' });
  });

  it('uses /latest only when it is dated exactly on the purchase date', () => {
    const latest = p('2026-10-09', '88.92580'); // history ends 08 Oct; /latest already has 09 Oct
    expect(resolvePurchaseNavWithLatest(real, latest, d('2026-10-09'), TODAY)).toMatchObject({
      kind: 'matched',
      gapDays: 0,
      point: { date: '2026-10-09', nav: '88.92580' },
    });
    // A later /latest can't prove there was no NAV in between, so the lot waits.
    expect(resolvePurchaseNavWithLatest(real, p('2026-10-12', '89'), d('2026-10-09'), d('2026-10-12'))).toEqual({
      kind: 'pending',
      lastDate: '2026-10-08',
    });
    // History answers first whenever it can.
    expect(resolvePurchaseNavWithLatest(real, latest, d('2026-10-02'), TODAY)).toMatchObject({
      kind: 'matched',
      point: { date: '2026-10-05' },
    });
  });

  it('reports long gaps so the form can warn about holes in the data', () => {
    const gappy = [p('2026-01-01', '10'), p('2026-01-20', '11')];
    const result = resolvePurchaseNav(gappy, d('2026-01-02'), TODAY);
    expect(result).toMatchObject({ kind: 'matched', gapDays: 18 });
    expect(result.kind === 'matched' && result.gapDays > GAP_WARNING_DAYS).toBe(true);
  });
});

describe('as-of lookups', () => {
  it('navOnOrBefore gives the NAV in force on a date', () => {
    expect(navOnOrBefore(real, d('2023-08-15'))?.date).toBe('2023-08-14');
    expect(navOnOrBefore(real, d('2024-03-31'))?.date).toBe('2024-03-31');
    expect(navOnOrBefore(real, d('2023-08-01'))).toBeNull();
  });

  it('navOnOrAfter gives the next NAV', () => {
    expect(navOnOrAfter(real, d('2026-10-02'))?.date).toBe('2026-10-05');
    expect(navOnOrAfter(real, d('2026-10-09'))).toBeNull();
  });

  it('lowerBound finds insertion points', () => {
    expect(lowerBound(real, d('2000-01-01'))).toBe(0);
    expect(lowerBound(real, d('2030-01-01'))).toBe(real.length);
  });
});

describe('buildSeries', () => {
  it('sorts ascending and keeps the first row listed for a date', () => {
    const { points, duplicates } = buildSeries([
      p('2026-10-08', '87.65550'),
      p('2026-10-07', '88.83890'),
      p('2026-10-08', '99.00000'),
    ]);
    expect(points.map((x) => [x.date, x.nav])).toEqual([
      ['2026-10-07', '88.83890'],
      ['2026-10-08', '87.65550'],
    ]);
    expect(duplicates).toBe(1);
  });
});

describe('mergeLatest (history can lag /latest by a day)', () => {
  const history = [p('2026-10-07', '88.83890'), p('2026-10-08', '87.65550')];

  it('appends a newer latest point', () => {
    expect(mergeLatest(history, p('2026-10-09', '88.92580')).map((x) => x.date)).toEqual([
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ]);
  });

  it('replaces a same-date point and ignores an older one', () => {
    expect(mergeLatest(history, p('2026-10-08', '87.70000')).at(-1)?.nav).toBe('87.70000');
    expect(mergeLatest(history, p('2026-10-01', '1'))).toEqual(history);
    expect(mergeLatest(history, null)).toEqual(history);
  });
});

describe('latestChange', () => {
  it('computes the change from the previous NAV exactly', () => {
    const change = latestChange(real);
    expect(change?.from.date).toBe('2026-10-07');
    expect(change?.to.date).toBe('2026-10-08');
    expect(change?.diff).toBe(-118_340_000n); // 87.65550 − 88.83890 = −1.18340
    expect(change?.pctHundredths).toBe(-133n); // −1.33%
  });

  it('needs two points', () => {
    expect(latestChange([p('2026-10-08', '1')])).toBeNull();
  });
});

describe('isStale', () => {
  it('flags NAVs older than 7 days', () => {
    expect(isStale(d('2018-06-01'), TODAY)).toBe(true);
    expect(isStale(d('2026-10-03'), TODAY)).toBe(false);
    expect(isStale(d('2026-10-02'), TODAY)).toBe(true);
  });
});

describe('navRowsNewestFirst', () => {
  it('lists newest first with the change from the previous NAV', () => {
    const rows = navRowsNewestFirst(real);
    expect(rows).toHaveLength(real.length);
    expect(rows[0]).toEqual({ date: '2026-10-08', nav: '87.65550', diff: -118_340_000n, pctHundredths: -133n });
    expect(rows.at(-1)).toEqual({ date: '2023-08-11', nav: '60.82130', diff: null, pctHundredths: null });
  });

  it('is empty for an empty series', () => {
    expect(navRowsNewestFirst([])).toEqual([]);
  });
});

describe('navListItems', () => {
  it('marks only gaps longer than a long weekend', () => {
    const items = navListItems(real);
    const gaps = items.filter((item) => item.kind === 'gap');
    // The fixture skips from 02 Apr 2024 to 30 Sep 2026 and from 17 Aug 2023 to 28 Mar 2024.
    expect(gaps).toEqual([
      { kind: 'gap', from: '2024-04-02', to: '2026-09-30', days: 911 },
      { kind: 'gap', from: '2023-08-17', to: '2024-03-28', days: 224 },
    ]);
    // Gandhi Jayanti plus the weekend (01 Oct to 05 Oct 2026) is 4 days: no marker.
    expect(items.filter((item) => item.kind === 'nav')).toHaveLength(real.length);
    expect(items[0]).toMatchObject({ kind: 'nav', row: { date: '2026-10-08' } });
  });
});

describe('rangeCovered', () => {
  it('enables a range only when the history reaches back to its start', () => {
    const short = [p('2026-03-01', '10'), p('2026-10-08', '11')];
    expect(rangeCovered(short, 1)).toBe(true);
    expect(rangeCovered(short, 6)).toBe(true);
    expect(rangeCovered(short, 12)).toBe(false);
    expect(rangeCovered(short, null)).toBe(true);
    expect(rangeCovered([], null)).toBe(false);
  });
});

describe('sliceRange', () => {
  const daily = Array.from({ length: 400 }, (_, i) => {
    const date = new Date(Date.UTC(2025, 8, 1 + i)).toISOString().slice(0, 10);
    return p(date, String(100 + i));
  });

  it('starts at the NAV in force on the range start date', () => {
    const last = daily.at(-1);
    const oneMonth = sliceRange(daily, 1);
    expect(oneMonth.at(-1)).toEqual(last);
    expect(oneMonth[0]?.date).toBe('2026-09-05'); // last is 2026-10-05
  });

  it('returns everything for the full range', () => {
    expect(sliceRange(daily, null)).toHaveLength(400);
  });
});
