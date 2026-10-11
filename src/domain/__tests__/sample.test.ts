import { describe, expect, it } from '@jest/globals';

import { HISTORY_PPFAS_FLEXI_DIRECT } from '../../api/__fixtures__/mfapi';
import { parseSchemeResponse } from '../../api/parse';
import { weekdayOf } from '../calendar';
import { addDays } from '../dates';
import { buildSamplePortfolio, SAMPLE_FUNDS, type SampleSeries } from '../sample';
import { detectSip } from '../sip';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;
const TODAY = d('2026-10-10');

/** A NAV of 100 on every weekday from 1 Dec 2021 to 9 Oct 2026. */
function weekdays(): NavPoint[] {
  const points: NavPoint[] = [];
  for (let date = d('2021-12-01'); date <= d('2026-10-09'); date = addDays(date, 1)) {
    const day = weekdayOf(date);
    if (day !== 0 && day !== 6) points.push({ date, nav: '100.0000', value: 100 });
  }
  return points;
}

const flat: SampleSeries = { points: weekdays(), latest: null };
const all = new Map(SAMPLE_FUNDS.map((fund) => [fund.schemeCode, flat]));
const of = (purchases: ReturnType<typeof buildSamplePortfolio>['purchases'], code: number) =>
  purchases.filter((item) => item.schemeCode === code);

describe('buildSamplePortfolio', () => {
  const { purchases, missing } = buildSamplePortfolio(all, TODAY);

  it('prices every purchase at the first NAV on or after its date, saving the amount paid', () => {
    expect(missing).toEqual([]);
    const [sunday, nearHigh] = of(purchases, 122639);
    // Sun 31 Mar 2024 has no NAV in this series, so Monday's applies.
    expect(sunday).toMatchObject({
      purchaseDate: '2024-03-31',
      applied: { navDate: '2024-04-01', nav: '100.0000' },
      units: '100',
      amount: '10000',
    });
    expect(nearHigh).toMatchObject({ purchaseDate: '2025-10-27', amount: '120000' });
  });

  it('runs the SIPs monthly, stopping the mid-cap one early so instalments are due', () => {
    const midCap = of(purchases, 118989);
    expect(midCap).toHaveLength(56);
    expect(midCap[0]?.purchaseDate).toBe('2022-01-10');
    expect(midCap.at(-1)?.purchaseDate).toBe('2026-08-10');
    expect(detectSip(midCap)?.nextDate).toBe('2026-09-10');
    const index = of(purchases, 120716);
    expect(index).toHaveLength(41);
    expect(index.at(-1)?.purchaseDate).toBe('2026-10-05');
  });

  it('dates the liquid fund purchase a week back', () => {
    const [liquid] = of(purchases, 143269);
    expect(liquid?.purchaseDate).toBe('2026-10-03');
    expect(liquid?.applied.navDate).toBe('2026-10-05');
  });

  it('reports a fund it could not price instead of leaving it out silently', () => {
    const partial = new Map(all);
    partial.delete(135781);
    partial.set(143269, { points: [], latest: null });
    expect(buildSamplePortfolio(partial, TODAY).missing).toEqual([135781, 143269]);
  });

  it("uses a real fund's weekend NAV where one was published", () => {
    const real = parseSchemeResponse(HISTORY_PPFAS_FLEXI_DIRECT, 122639).points;
    const { purchases: priced } = buildSamplePortfolio(new Map([[122639, { points: real, latest: null }]]), TODAY);
    expect(priced[0]?.applied).toEqual({ navDate: '2024-03-31', nav: '74.86850' });
  });
});
