import { VALUE_SCALE, rescale, toPlainString } from '../domain/decimal';
import { lotInvested } from '../domain/valuation';
import { sanitizePortfolio, type HoldingLot, type PortfolioData } from './portfolioSchema';

/**
 * Moving your data off the phone and back. A backup is plain JSON the user can share to
 * themselves; restoring runs it through the same validation as every app launch, so a
 * damaged or hand-edited backup can never put bad rows into the store.
 */

export const BACKUP_APP = 'mutual-fund-explorer';
export const BACKUP_VERSION = 1;
/**
 * The most text the restore box takes. A backup of 600 purchases is about 150,000
 * characters; the cap keeps a stray paste of something huge from stalling the parse.
 */
export const MAX_BACKUP_CHARS = 1_000_000;

export function makeBackup(data: PortfolioData, exportedAt: string): string {
  return JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, watchlist: data.watchlist, lots: data.lots },
    null,
    1,
  );
}

export type BackupCheck =
  { ok: true; data: PortfolioData; dropped: number; exportedAt: string | null } | { ok: false; error: string };

export function readBackup(text: string): BackupCheck {
  // At the cap, the paste was cut off by the field (or is far bigger than any real backup).
  if (text.length >= MAX_BACKUP_CHARS) {
    return { ok: false, error: 'That text is too long to be a backup from this app.' };
  }
  let json: unknown;
  try {
    json = JSON.parse(text.trim());
  } catch {
    return { ok: false, error: "That isn't a backup from this app. Paste the whole text you shared, from { to }." };
  }
  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== BACKUP_APP) {
    return { ok: false, error: "That isn't a backup from this app." };
  }
  const raw = json as { watchlist?: unknown; lots?: unknown; exportedAt?: unknown };
  const data = sanitizePortfolio(raw);
  const given =
    (Array.isArray(raw.watchlist) ? raw.watchlist.length : 0) + (Array.isArray(raw.lots) ? raw.lots.length : 0);
  const kept = data.watchlist.length + data.lots.length;
  if (kept === 0) return { ok: false, error: 'The backup has no funds or purchases in it.' };
  return {
    ok: true,
    data,
    dropped: given - kept,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
  };
}

/**
 * One CSV cell. Scheme names come from an outside API, and spreadsheets run a cell that
 * starts with =, +, -, @ (or a tab or carriage return) as a formula, so such text cells
 * get a leading apostrophe and are read as plain text (CSV formula injection).
 */
function csvCell(value: string, numeric = false): string {
  const safe = !numeric && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Plain rupees with exactly two decimals for a spreadsheet: "9391.00", never "9391". */
function csvRupees(value: bigint): string {
  const [whole, fraction = ''] = toPlainString(rescale(value, VALUE_SCALE, 2), 2).split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

/** Every purchase as a spreadsheet row; amounts in plain rupees with two decimals. */
export function holdingsCsv(lots: readonly HoldingLot[]): string {
  const header = ['Fund', 'Scheme code', 'Purchase date', 'Units', 'NAV applied', 'NAV date', 'Invested (INR)'];
  const rows = lots.map((lot) => {
    const cost = lotInvested(lot);
    const invested = cost !== null ? csvRupees(cost) : '';
    return [
      lot.schemeName,
      String(lot.schemeCode),
      lot.purchaseDate,
      lot.units,
      lot.applied?.nav ?? '',
      lot.applied?.navDate ?? '',
      invested,
    ];
  });
  // Columns 1, 3, 4 and 6 hold numbers we formatted ourselves; the rest is text.
  const numericColumns = new Set([1, 3, 4, 6]);
  return [
    header.map((cell) => csvCell(cell)),
    ...rows.map((row) => row.map((cell, i) => csvCell(cell, numericColumns.has(i)))),
  ]
    .map((row) => row.join(','))
    .join('\n');
}
