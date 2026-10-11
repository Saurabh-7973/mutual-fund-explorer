import { describe, expect, it } from '@jest/globals';

import type { IsoDate } from '../../domain/types';
import { holdingsCsv, makeBackup, readBackup } from '../backup';
import type { HoldingLot, PortfolioData } from '../portfolioSchema';

const lot: HoldingLot = {
  id: 'lot-1',
  schemeCode: 122639,
  schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
  units: '125.432',
  purchaseDate: '2024-03-31' as IsoDate,
  applied: { navDate: '2024-03-31' as IsoDate, nav: '74.86850' },
  createdAt: '2026-10-10T12:00:00.000Z',
};
const data: PortfolioData = {
  watchlist: [{ schemeCode: 100121, schemeName: 'HDFC Balanced Fund', addedAt: '2026-10-10T12:00:00.000Z' }],
  lots: [lot],
};

describe('backup', () => {
  it('round-trips the watchlist and purchases', () => {
    const result = readBackup(makeBackup(data, '2026-10-11T10:00:00.000Z'));
    expect(result).toEqual({ ok: true, data, dropped: 0, exportedAt: '2026-10-11T10:00:00.000Z' });
  });

  it('drops damaged rows and counts them', () => {
    const text = makeBackup({ ...data, lots: [lot, { ...lot, id: 'bad', units: 'abc' }] }, 'x');
    const result = readBackup(text);
    expect(result.ok && result.dropped).toBe(1);
    expect(result.ok && result.data.lots).toHaveLength(1);
  });

  it('keeps the amount paid through a backup, and exports it as Invested', () => {
    const paid = { ...lot, amount: '9391' };
    const result = readBackup(makeBackup({ ...data, lots: [paid] }, 'x'));
    expect(result.ok && result.data.lots[0]?.amount).toBe('9391');
    expect(holdingsCsv([paid]).split('\n')[1]?.endsWith(',9391.00')).toBe(true);
    expect(holdingsCsv([lot]).split('\n')[1]?.endsWith(',9390.91')).toBe(true);
  });

  it('refuses text that is not a backup, or an empty one', () => {
    expect(readBackup('hello').ok).toBe(false);
    expect(readBackup('{"app":"other"}').ok).toBe(false);
    expect(readBackup(makeBackup({ watchlist: [], lots: [] }, 'x')).ok).toBe(false);
  });
});

describe('holdingsCsv', () => {
  it('writes one row per purchase with the exact amount invested', () => {
    expect(holdingsCsv([lot]).split('\n')).toEqual([
      'Fund,Scheme code,Purchase date,Units,NAV applied,NAV date,Invested (INR)',
      'Parag Parikh Flexi Cap Fund - Direct Plan - Growth,122639,2024-03-31,125.432,74.86850,2024-03-31,9390.91',
    ]);
  });

  it('neutralises text that a spreadsheet would run as a formula', () => {
    const row = holdingsCsv([{ ...lot, schemeName: '=HYPERLINK("http://x","y")' }]).split('\n')[1] ?? '';
    expect(row.startsWith(`"'=HYPERLINK(""http://x"",""y"")",`)).toBe(true);
    expect(holdingsCsv([{ ...lot, schemeName: '+cmd' }]).split('\n')[1]?.startsWith("'+cmd,")).toBe(true);
    expect(holdingsCsv([{ ...lot, schemeName: '@SUM(A1)' }]).split('\n')[1]?.startsWith("'@SUM(A1),")).toBe(true);
  });

  it('quotes names with commas', () => {
    expect(holdingsCsv([{ ...lot, schemeName: 'A, B Fund' }]).split('\n')[1]?.startsWith('"A, B Fund",')).toBe(true);
  });
});
