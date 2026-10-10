/**
 * Real mfapi.in payloads captured on 10 Oct 2026 (trimmed where noted).
 * Tests run against what the API actually sends, not what docs say it sends.
 */

/** GET /mf/122639/latest — verbatim. */
export const LATEST_PPFAS_FLEXI_DIRECT = {
  meta: {
    fund_house: 'PPFAS Mutual Fund',
    scheme_type: 'Open Ended Schemes',
    scheme_category: 'Equity Scheme - Flexi Cap Fund',
    scheme_code: 122639,
    scheme_name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    isin_growth: 'INF879O01027',
    isin_div_reinvestment: null,
  },
  data: [{ date: '09-10-2026', nav: '88.92580' }],
  status: 'SUCCESS',
};

/** GET /mf/99999999 — verbatim: an unknown code still answers HTTP 200 and "SUCCESS". */
export const UNKNOWN_SCHEME = {
  meta: {
    fund_house: '',
    scheme_type: '',
    scheme_category: '',
    scheme_code: 0,
    scheme_name: '',
    isin_growth: null,
    isin_div_reinvestment: null,
  },
  data: [],
  status: 'SUCCESS',
};

/** GET /mf/100121/latest — verbatim: a closed scheme whose "latest" NAV is from 2018. */
export const LATEST_CLOSED_SCHEME = {
  meta: {
    fund_house: 'HDFC Mutual Fund',
    scheme_type: 'Open Ended Schemes',
    scheme_category: 'Income',
    scheme_code: 100121,
    scheme_name: 'HDFC Balanced Fund - Dividend Option',
    isin_growth: null,
    isin_div_reinvestment: null,
  },
  data: [{ date: '01-06-2018', nav: '30.65100' }],
  status: 'SUCCESS',
};

/** GET /mf/search?q=parag%20parikh — verbatim. */
export const SEARCH_PARAG_PARIKH = [
  { schemeCode: 122640, schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - Growth' },
  { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
  { schemeCode: 153964, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Monthly IDCW Payout' },
  { schemeCode: 153965, schemeName: 'Parag Parikh Flexi Cap Fund - Regular Plan - Monthly IDCW Payout' },
  { schemeCode: 147482, schemeName: 'Parag Parikh ELSS Tax Saver Fund - Regular Plan - Growth' },
  { schemeCode: 147481, schemeName: 'Parag Parikh ELSS Tax Saver Fund - Direct Plan - Growth' },
  { schemeCode: 143269, schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Growth' },
  { schemeCode: 143266, schemeName: 'Parag Parikh Liquid Fund - Regular Plan - Weekly Reinvestment of IDCW' },
  { schemeCode: 143265, schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Weekly Reinvestment of IDCW' },
  { schemeCode: 143264, schemeName: 'Parag Parikh Liquid Fund - Regular Plan - Daily Reinvestment of IDCW' },
  { schemeCode: 143263, schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Daily Reinvestment of IDCW' },
  { schemeCode: 143262, schemeName: 'Parag Parikh Liquid Fund - Direct Plan - Monthly IDCW Payout' },
  { schemeCode: 143261, schemeName: 'Parag Parikh Liquid Fund - Regular Plan - Monthly IDCW Payout' },
  { schemeCode: 143260, schemeName: 'Parag Parikh Liquid Fund - Regular Plan - Growth' },
  { schemeCode: 152469, schemeName: 'Parag Parikh Dynamic Asset Allocation Fund' },
];

/**
 * GET /mf/122639 — selected real rows, newest first as the API sends them.
 * Includes three real non-trading gaps:
 *  - Tue 15 Aug 2023 (Independence Day): no NAV
 *  - Fri 29 Mar 2024 (Good Friday) and Sat 30 Mar: no NAV, but Sun 31 Mar 2024 HAS one (financial year-end)
 *  - Fri 2 Oct 2026 (Gandhi Jayanti) and the weekend: no NAV
 */
export const HISTORY_PPFAS_FLEXI_DIRECT_ROWS = [
  { date: '08-10-2026', nav: '87.65550' },
  { date: '07-10-2026', nav: '88.83890' },
  { date: '06-10-2026', nav: '88.99700' },
  { date: '05-10-2026', nav: '88.76200' },
  { date: '01-10-2026', nav: '88.25690' },
  { date: '30-09-2026', nav: '88.83550' },
  { date: '02-04-2024', nav: '75.66720' },
  { date: '01-04-2024', nav: '75.73310' },
  { date: '31-03-2024', nav: '74.86850' },
  { date: '28-03-2024', nav: '74.86590' },
  { date: '17-08-2023', nav: '60.37750' },
  { date: '16-08-2023', nav: '60.85300' },
  { date: '14-08-2023', nav: '61.01840' },
  { date: '11-08-2023', nav: '60.82130' },
];

export const HISTORY_PPFAS_FLEXI_DIRECT = {
  meta: LATEST_PPFAS_FLEXI_DIRECT.meta,
  data: HISTORY_PPFAS_FLEXI_DIRECT_ROWS,
  status: 'SUCCESS',
};
