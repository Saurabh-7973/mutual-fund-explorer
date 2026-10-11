/**
 * Which fund house (AMC) a scheme belongs to, read from the start of its name, and a short
 * monogram for it. mfapi.in has no logos, so a monogram in a fixed colour per house is how
 * a list stays scannable ("the green PP is my Parag Parikh fund"). Names are matched case-
 * insensitively because AMFI's data mixes "NIPPON INDIA" and "Nippon India".
 */

export interface FundHouseMark {
  /** Short name as investors say it: "Parag Parikh", "ICICI Prudential". */
  name: string;
  /** One to three characters for the badge. */
  monogram: string;
  /** Stable index into the badge colours, so a house keeps its colour everywhere. */
  tone: number;
}

/** Longest prefixes first where one house's name starts another's ("Bank of India" vs "Bandhan"). */
const HOUSES: readonly { prefix: RegExp; name: string; monogram: string }[] = [
  { prefix: /^aditya birla|^birla sun/i, name: 'Aditya Birla Sun Life', monogram: 'AB' },
  { prefix: /^axis/i, name: 'Axis', monogram: 'AX' },
  { prefix: /^bajaj finserv/i, name: 'Bajaj Finserv', monogram: 'BF' },
  { prefix: /^bandhan|^idfc/i, name: 'Bandhan', monogram: 'BD' },
  { prefix: /^bank of india/i, name: 'Bank of India', monogram: 'BOI' },
  { prefix: /^baroda/i, name: 'Baroda BNP Paribas', monogram: 'BB' },
  { prefix: /^canara robeco/i, name: 'Canara Robeco', monogram: 'CR' },
  { prefix: /^dsp/i, name: 'DSP', monogram: 'DSP' },
  { prefix: /^edelweiss/i, name: 'Edelweiss', monogram: 'ED' },
  { prefix: /^franklin|^templeton/i, name: 'Franklin Templeton', monogram: 'FT' },
  { prefix: /^groww/i, name: 'Groww', monogram: 'GR' },
  { prefix: /^hdfc/i, name: 'HDFC', monogram: 'HD' },
  { prefix: /^helios/i, name: 'Helios', monogram: 'HE' },
  { prefix: /^hsbc/i, name: 'HSBC', monogram: 'HS' },
  { prefix: /^icici/i, name: 'ICICI Prudential', monogram: 'IP' },
  { prefix: /^invesco/i, name: 'Invesco', monogram: 'IV' },
  { prefix: /^iti\b/i, name: 'ITI', monogram: 'ITI' },
  { prefix: /^jm\b/i, name: 'JM Financial', monogram: 'JM' },
  { prefix: /^kotak/i, name: 'Kotak', monogram: 'KO' },
  { prefix: /^lic\s?mf|^lic\b/i, name: 'LIC', monogram: 'LIC' },
  { prefix: /^mahindra/i, name: 'Mahindra Manulife', monogram: 'MM' },
  { prefix: /^mirae/i, name: 'Mirae Asset', monogram: 'MA' },
  { prefix: /^motilal/i, name: 'Motilal Oswal', monogram: 'MO' },
  { prefix: /^navi\b/i, name: 'Navi', monogram: 'NV' },
  { prefix: /^nippon|^reliance/i, name: 'Nippon India', monogram: 'NI' },
  { prefix: /^old bridge/i, name: 'Old Bridge', monogram: 'OB' },
  { prefix: /^parag parikh|^ppfas/i, name: 'Parag Parikh', monogram: 'PP' },
  { prefix: /^pgim|^dhfl pramerica/i, name: 'PGIM India', monogram: 'PG' },
  { prefix: /^quant\b/i, name: 'Quant', monogram: 'QT' },
  { prefix: /^quantum/i, name: 'Quantum', monogram: 'QM' },
  { prefix: /^samco/i, name: 'Samco', monogram: 'SA' },
  { prefix: /^sbi/i, name: 'SBI', monogram: 'SBI' },
  { prefix: /^shriram/i, name: 'Shriram', monogram: 'SH' },
  { prefix: /^sundaram/i, name: 'Sundaram', monogram: 'SU' },
  { prefix: /^tata/i, name: 'Tata', monogram: 'TA' },
  { prefix: /^taurus/i, name: 'Taurus', monogram: 'TU' },
  { prefix: /^trust/i, name: 'Trust', monogram: 'TR' },
  { prefix: /^union/i, name: 'Union', monogram: 'UN' },
  { prefix: /^uti/i, name: 'UTI', monogram: 'UTI' },
  { prefix: /^whiteoak/i, name: 'WhiteOak Capital', monogram: 'WO' },
  { prefix: /^zerodha/i, name: 'Zerodha', monogram: 'ZE' },
  { prefix: /^360\s?one|^iifl/i, name: '360 ONE', monogram: '360' },
];

/** How many badge colours the theme provides. */
export const MARK_TONES = 6;

/** A small stable hash, so the same monogram always picks the same colour. */
function toneOf(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % MARK_TONES;
}

export function fundHouseOf(schemeName: string): FundHouseMark {
  const name = schemeName.trim();
  const known = HOUSES.find((house) => house.prefix.test(name));
  if (known !== undefined) return { name: known.name, monogram: known.monogram, tone: toneOf(known.name) };
  // Unknown house: the initials of its first two words ("Old Mutual" → "OM").
  const words = name.split(/[\s-]+/).filter((word) => /^[a-z0-9]/i.test(word));
  const monogram = (words.slice(0, 2).map((word) => word[0] ?? '').join('') || '?').toUpperCase();
  return { name: words[0] ?? name, monogram, tone: toneOf(monogram) };
}
