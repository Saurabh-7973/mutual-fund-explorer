/**
 * Plain explanations of the terms the app uses, for someone new to mutual funds.
 * Two or three short sentences each: what it is, then why it matters here.
 */

export type GlossaryKey =
  | 'nav'
  | 'xirr'
  | 'cagr'
  | 'absolute'
  | 'oneDay'
  | 'direct'
  | 'idcw'
  | 'stale'
  | 'awaitingNav'
  | 'rolling'
  | 'drawdown'
  | 'assetClass'
  | 'averageCost'
  | 'lockIn'
  | 'longTerm';

export interface GlossaryEntry {
  title: string;
  body: string;
}

export const GLOSSARY: Record<GlossaryKey, GlossaryEntry> = {
  nav: {
    title: 'NAV (net asset value)',
    body: "The price of one unit of a fund, worked out once a day after the market closes. Your units × the NAV is what your holding is worth. A NAV's date is the business day it's for.",
  },
  xirr: {
    title: 'XIRR',
    body: 'Your yearly return when you invested on different dates, such as a monthly SIP. It counts how long each rupee was invested, so it is the fairest single number for SIPs. Shown once your oldest purchase is a year old.',
  },
  cagr: {
    title: 'Annualised return (CAGR)',
    body: 'The steady yearly growth that would turn the starting NAV into the ending one. "3Y annualised" means the yearly rate over the last 3 years. Long-term investors compare funds on it, because a single year can be lucky or unlucky.',
  },
  absolute: {
    title: 'Absolute return',
    body: "The total change over a period, not per year. Periods under a year are shown this way, because turning a few months' move into a yearly rate would exaggerate it.",
  },
  oneDay: {
    title: '1D (one-day) change',
    body: 'How much the value moved between the last two published NAVs. Long-term money moves up and down daily; this is context, not a signal to act.',
  },
  direct: {
    title: 'Direct and Regular plans',
    body: 'The same fund with the same investments, sold two ways. Regular plans pay a distributor commission out of the fund every year, so Direct plans cost less and return a little more over time.',
  },
  idcw: {
    title: 'Growth and IDCW options',
    body: 'In Growth, gains stay in the fund and the NAV keeps compounding. In IDCW (formerly "dividend"), the fund pays some money out, and the NAV drops by the payout. This app counts NAV only, so IDCW returns look lower than what you actually received.',
  },
  stale: {
    title: 'Stale NAV',
    body: 'No new NAV in more than 7 days. Funds publish every business day, so this usually means the scheme was closed or merged. Figures for it stop at its last NAV.',
  },
  awaitingNav: {
    title: 'Awaiting NAV',
    body: "A purchase gets the first NAV published on or after its date. Until that NAV is out (usually the same night or the next business day), the purchase is saved but can't be valued yet.",
  },
  rolling: {
    title: 'Rolling returns',
    body: 'Instead of one return ending today, every possible holding period of the same length: had you bought on any day and held for 3 years, what did you get? The range shows how consistent a fund has been.',
  },
  drawdown: {
    title: 'Worst fall (drawdown)',
    body: 'The biggest drop in NAV from a high point to the low that followed, before it climbed back. It shows how much patience a fund has needed in the past.',
  },
  assetClass: {
    title: 'Asset class',
    body: 'What a fund mainly invests in: equity (shares), debt (bonds and deposits), hybrid (a mix), or gold and silver. Your split between them drives your risk more than any single fund.',
  },
  averageCost: {
    title: 'Average cost',
    body: 'What you paid per unit on average across all your purchases. When the NAV is above it, your holding is in profit.',
  },
  lockIn: {
    title: 'ELSS lock-in',
    body: "ELSS (tax-saving) funds lock each purchase for 3 years from the day it was made, so a monthly SIP unlocks one instalment at a time. Until then those units can't be redeemed or switched.",
  },
  longTerm: {
    title: 'Long-term units',
    body: 'Units of an equity fund held for more than 12 months count as long-term for capital gains tax, which is usually taxed lower than short-term gains. Each purchase has its own date. Check the current rules before you sell.',
  },
};
