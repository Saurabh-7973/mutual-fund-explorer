/**
 * Which asset class a scheme invests in, from AMFI's category text (with the scheme name
 * for index funds and ETFs, which AMFI files under "Other"). This is what "asset
 * allocation" means to an investor: equity against debt, not one fund against another.
 */

export type AssetClass = 'Equity' | 'Debt' | 'Hybrid' | 'Gold & silver' | 'Other';

/** Fixed order: chart colours follow the class, never its rank. */
export const ASSET_CLASSES: readonly AssetClass[] = ['Equity', 'Debt', 'Hybrid', 'Gold & silver', 'Other'];

const GOLD = /\b(gold|silver|precious metal)/i;
const DEBT =
  /\b(debt|income|liquid|money market|gilt|overnight|bond|credit risk|duration|floater|banking and psu|corporate bond|sdl|g-sec|t-bill|treasury|target maturity|fixed maturity|fmp|interval)\b/i;
const HYBRID = /\b(hybrid|balanced|arbitrage|asset allocation|equity savings|multi asset|balanced advantage)\b/i;
const EQUITY =
  /\b(equity|elss|cap|index|nifty|sensex|bse|etf|focused|value|contra|dividend yield|sectoral|thematic|flexi)\b/i;

export function assetClassOf(category: string | null, schemeName: string): AssetClass {
  const cat = category ?? '';
  // Gold and silver first: "Other Scheme - FoF Domestic" can hold either, and only the name tells.
  if (GOLD.test(cat) || GOLD.test(schemeName)) return 'Gold & silver';
  if (/^\s*equity\b/i.test(cat) || /\belss\b/i.test(cat)) return 'Equity';
  if (/^\s*hybrid\b/i.test(cat)) return 'Hybrid';
  if (/^\s*(debt|income)/i.test(cat) || /\bincome\/debt\b/i.test(cat)) return 'Debt';
  // Index funds, ETFs, fund of funds and legacy categories: the name is more specific than
  // "Other Scheme - Index Funds" (a Bharat Bond ETF is filed there too), so read it first.
  for (const text of [schemeName, cat]) {
    if (HYBRID.test(text)) return 'Hybrid';
    if (DEBT.test(text)) return 'Debt';
    if (EQUITY.test(text)) return 'Equity';
  }
  return 'Other';
}
