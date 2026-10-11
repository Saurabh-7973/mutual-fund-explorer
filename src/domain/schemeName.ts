/**
 * Best-effort labels from AMFI scheme names, which follow loose conventions:
 *   "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"
 *   "HDFC Balanced Fund - Dividend Option"            (closed, legacy wording)
 *   "Parag Parikh Dynamic Asset Allocation Fund"       (no plan or option at all)
 * Unknown parts stay null rather than guessed.
 */

export type Plan = 'Direct' | 'Regular';
export type PayoutOption = 'Growth' | 'IDCW';

export interface SchemeLabel {
  /** Name before the first " - " separator, e.g. "Parag Parikh Flexi Cap Fund". */
  title: string;
  /** The rest, e.g. "Direct Plan - Growth"; empty when the name has no separator. */
  variant: string;
  plan: Plan | null;
  option: PayoutOption | null;
}

export function describeScheme(name: string): SchemeLabel {
  const clean = name.replace(/\s+/g, ' ').trim();
  const parts = clean.split(/\s+-\s+/);
  const title = parts[0] ?? clean;
  const variant = parts.slice(1).join(' - ');

  // Read plan and option from the variant only, so fund names such as
  // "Dividend Yield Fund" or "Regular Savings Fund" don't mislabel themselves.
  // Names without a " - " separator fall back to the whole name.
  const source = variant !== '' ? variant : clean;

  const plan: Plan | null = /\bdirect\b/i.test(source) ? 'Direct' : /\bregular\b/i.test(source) ? 'Regular' : null;

  // IDCW was called "Dividend" before April 2021, so both words count.
  const option: PayoutOption | null = /\b(idcw|dividend)\b/i.test(source)
    ? 'IDCW'
    : /\bgrowth\b/i.test(source)
      ? 'Growth'
      : null;

  return { title, variant, plan, option };
}

/**
 * The payout option when the name doesn't say, from the ISINs AMFI publishes: a scheme with
 * only an IDCW-reinvestment ISIN is an IDCW plan, one with only a growth ISIN is Growth.
 * With both or neither it stays unknown, rather than a guess. (Direct or Regular can't be
 * read from an ISIN.)
 */
export function optionFromIsins(isinGrowth: string | null, isinDivReinvestment: string | null): PayoutOption | null {
  if (isinGrowth === null && isinDivReinvestment !== null) return 'IDCW';
  if (isinGrowth !== null && isinDivReinvestment === null) return 'Growth';
  return null;
}
