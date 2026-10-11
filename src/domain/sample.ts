import { addDays } from './dates';
import { buyRupees, planSip, type SipInstalment } from './sip';
import type { IsoDate, NavPoint } from './types';

/**
 * A sample portfolio for a first look: real funds bought on real dates, priced from
 * their published NAVs by the same rules as a purchase the user types in (the first NAV
 * on or after the date; units to 4 decimals; the amount paid saved). Chosen so every
 * feature has something to show: a weekend purchase, a purchase near the high (a loss),
 * a running SIP with instalments due, an ELSS lock-in, equity, index and debt in the
 * allocation, and a closed scheme on the watchlist. Scheme codes checked against mfapi.in.
 */

export type SampleBuy =
  /** One purchase; `daysAgo` dates it relative to today (a recent purchase stays recent). */
  | { kind: 'once'; rupees: number; date: IsoDate }
  | { kind: 'once'; rupees: number; daysAgo: number }
  /** Monthly from `start`, through `until` (or today). */
  | { kind: 'sip'; rupees: number; start: IsoDate; until?: IsoDate };

export interface SampleFund {
  schemeCode: number;
  schemeName: string;
  buys: readonly SampleBuy[];
}

const d = (date: string) => date as IsoDate;

export const SAMPLE_FUNDS: readonly SampleFund[] = [
  {
    schemeCode: 122639,
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    buys: [
      // A Sunday with a published NAV (31 Mar 2024, financial year end).
      { kind: 'once', rupees: 10_000, date: d('2024-03-31') },
      // Close to the 1-year high, so this purchase shows a loss.
      { kind: 'once', rupees: 1_20_000, date: d('2025-10-27') },
    ],
  },
  {
    schemeCode: 118989,
    schemeName: 'HDFC Mid Cap Fund - Direct Plan - Growth Option',
    // Stops two months back, so the fund page offers "Add instalments due".
    buys: [{ kind: 'sip', rupees: 5_000, start: d('2022-01-10'), until: d('2026-08-10') }],
  },
  {
    schemeCode: 120716,
    schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
    buys: [{ kind: 'sip', rupees: 2_000, start: d('2023-06-05') }],
  },
  {
    schemeCode: 135781,
    schemeName: 'Mirae Asset ELSS Tax Saver Fund - Direct Plan - Growth',
    buys: [{ kind: 'once', rupees: 50_000, date: d('2024-02-15') }],
  },
  {
    schemeCode: 143269,
    schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Growth',
    buys: [{ kind: 'once', rupees: 25_000, daysAgo: 7 }],
  },
];

export const SAMPLE_WATCHLIST: readonly { schemeCode: number; schemeName: string }[] = [
  { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
  // Named with no plan or option in AMFI's data: the tags come from its ISINs.
  { schemeCode: 152469, schemeName: 'Parag Parikh Dynamic Asset Allocation Fund' },
  // Closed in 2018: shows how a stale NAV is flagged.
  { schemeCode: 100121, schemeName: 'HDFC Balanced Fund - Dividend Option' },
];

export interface SampleSeries {
  /** The raw history points, not merged with /latest (the purchase rule takes them apart). */
  points: readonly NavPoint[];
  latest: NavPoint | null;
}

export interface SamplePurchase extends SipInstalment {
  schemeCode: number;
  schemeName: string;
}

/**
 * Prices every sample purchase. `missing` lists funds whose history wasn't supplied or
 * gave nothing, so the caller can report a failure instead of saving half a portfolio.
 */
export function buildSamplePortfolio(
  series: ReadonlyMap<number, SampleSeries>,
  today: IsoDate,
): { purchases: SamplePurchase[]; missing: number[] } {
  const purchases: SamplePurchase[] = [];
  const missing: number[] = [];
  for (const fund of SAMPLE_FUNDS) {
    const data = series.get(fund.schemeCode);
    const bought: SipInstalment[] = [];
    if (data !== undefined) {
      for (const buy of fund.buys) {
        if (buy.kind === 'sip') {
          const plan = planSip(data.points, data.latest, buy.rupees, buy.start, today);
          bought.push(...plan.instalments.filter((item) => buy.until === undefined || item.purchaseDate <= buy.until));
        } else {
          const date = 'date' in buy ? buy.date : addDays(today, -buy.daysAgo);
          const purchase = buyRupees(data.points, data.latest, buy.rupees, date, today);
          if (purchase !== null) bought.push(purchase);
        }
      }
    }
    if (bought.length === 0) missing.push(fund.schemeCode);
    else purchases.push(...bought.map((item) => ({ ...item, schemeCode: fund.schemeCode, schemeName: fund.schemeName })));
  }
  return { purchases, missing };
}
