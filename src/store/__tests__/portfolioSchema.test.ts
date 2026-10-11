import { describe, expect, it } from '@jest/globals';

import type { IsoDate } from '../../domain/types';
import {
  EMPTY_PORTFOLIO,
  addLot,
  addWatch,
  isWatched,
  newLotId,
  removeLot,
  removeWatch,
  resolveLot,
  restoreWatch,
  sanitizePortfolio,
  type HoldingLot,
  type PortfolioData,
  type WatchItem,
} from '../portfolioSchema';

const d = (value: string) => value as IsoDate;
const codes = (data: PortfolioData) => data.watchlist.map((item) => item.schemeCode);

const watch = (schemeCode: number, schemeName = `Scheme ${schemeCode}`): WatchItem => ({
  schemeCode,
  schemeName,
  addedAt: '2026-10-10T05:00:00.000Z',
});

const lot = (overrides: Partial<HoldingLot> = {}): HoldingLot => ({
  id: 'lot-1',
  schemeCode: 122639,
  schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
  units: '125.432',
  purchaseDate: d('2024-03-29'),
  applied: { navDate: d('2024-03-31'), nav: '74.86850' },
  createdAt: '2026-10-10T05:00:00.000Z',
  ...overrides,
});

describe('sanitizePortfolio', () => {
  it('keeps a valid amount paid, and drops only a bad amount (the purchase stays)', () => {
    const data = { watchlist: [], lots: [lot({ amount: '9391' }), lot({ id: 'lot-2', amount: 'abc' })] };
    const clean = sanitizePortfolio(data);
    expect(clean.lots[0]?.amount).toBe('9391');
    expect(clean.lots[1]).toBeDefined();
    expect(clean.lots[1] && 'amount' in clean.lots[1]).toBe(false);
  });

  it('loads purchases saved before amounts existed unchanged', () => {
    expect(sanitizePortfolio({ watchlist: [], lots: [lot()] }).lots[0]).toEqual(lot());
  });

  const valid: PortfolioData = {
    watchlist: [watch(122639)],
    lots: [lot(), lot({ id: 'lot-2', purchaseDate: d('2026-10-09'), applied: null })],
  };

  it('keeps valid data as it is, including after a JSON round trip', () => {
    expect(sanitizePortfolio(valid)).toEqual(valid);
    expect(sanitizePortfolio(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it('survives garbage from storage', () => {
    expect(sanitizePortfolio(null)).toEqual(EMPTY_PORTFOLIO);
    expect(sanitizePortfolio('{"watchlist":')).toEqual(EMPTY_PORTFOLIO);
    expect(sanitizePortfolio({ watchlist: 'nope', lots: 7 })).toEqual(EMPTY_PORTFOLIO);
  });

  it('drops corrupt rows and keeps the rest', () => {
    const result = sanitizePortfolio({
      watchlist: [watch(1), { schemeCode: '2', schemeName: 'String code' }, { schemeCode: 3 }, watch(1, 'Duplicate'), watch(4)],
      lots: [
        lot({ id: 'ok' }),
        lot({ id: 'too-many-decimals', units: '1.23456' }),
        lot({ id: 'zero-units', units: '0' }),
        lot({ id: 'impossible-date', purchaseDate: d('2024-02-30') }),
        lot({ id: 'nav-before-purchase', applied: { navDate: d('2024-03-28'), nav: '74.86590' } }),
        lot({ id: 'negative-nav', applied: { navDate: d('2024-03-31'), nav: '-1' } }),
        { ...lot({ id: 'applied-missing' }), applied: undefined },
        lot({ id: 'ok', units: '1' }),
      ],
    });
    expect(codes(result)).toEqual([1, 4]);
    expect(result.watchlist[0]?.schemeName).toBe('Scheme 1');
    expect(result.lots.map((item) => item.id)).toEqual(['ok']);
    expect(result.lots[0]?.units).toBe('125.432');
  });

  it('fills a missing timestamp instead of dropping the row', () => {
    const result = sanitizePortfolio({ watchlist: [{ schemeCode: 5, schemeName: 'Five' }], lots: [] });
    expect(result.watchlist[0]?.addedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('watchlist transitions', () => {
  it('adds newest first and ignores a scheme that is already watched', () => {
    const one = addWatch(EMPTY_PORTFOLIO, watch(1));
    const two = addWatch(one, watch(2));
    expect(codes(two)).toEqual([2, 1]);
    expect(addWatch(two, watch(1))).toBe(two);
    expect(isWatched(two, 2)).toBe(true);
    expect(isWatched(two, 3)).toBe(false);
  });

  it('removes, then restores at the original position for Undo', () => {
    const data: PortfolioData = { watchlist: [watch(3), watch(2), watch(1)], lots: [] };
    const removed = removeWatch(data, 2);
    expect(codes(removed)).toEqual([3, 1]);
    expect(codes(restoreWatch(removed, watch(2), 1))).toEqual([3, 2, 1]);
    expect(codes(restoreWatch(removed, watch(2), 99))).toEqual([3, 1, 2]);
    expect(removeWatch(removed, 2)).toBe(removed);
    expect(restoreWatch(data, watch(2), 0)).toBe(data);
  });

  it('never deletes holdings when a fund leaves the watchlist', () => {
    const data: PortfolioData = { watchlist: [watch(122639)], lots: [lot()] };
    expect(removeWatch(data, 122639).lots).toEqual([lot()]);
  });
});

describe('lot transitions', () => {
  it('adds and removes lots, ignoring a repeated id', () => {
    const added = addLot(EMPTY_PORTFOLIO, lot());
    expect(added.lots).toHaveLength(1);
    expect(addLot(added, lot({ units: '9' }))).toBe(added);
    expect(removeLot(added, 'lot-1').lots).toEqual([]);
    expect(removeLot(added, 'missing').lots).toHaveLength(1);
  });

  it('prices an "Awaiting NAV" lot once, and never with a NAV from before the purchase', () => {
    const pending = lot({ id: 'pending', purchaseDate: d('2026-10-09'), applied: null });
    const data: PortfolioData = { watchlist: [], lots: [pending, lot()] };

    const resolved = resolveLot(data, 'pending', { navDate: d('2026-10-09'), nav: '88.92580' });
    expect(resolved.lots[0]?.applied).toEqual({ navDate: '2026-10-09', nav: '88.92580' });
    expect(resolved.lots[1]).toBe(data.lots[1]);

    expect(resolveLot(data, 'pending', { navDate: d('2026-10-08'), nav: '87.65550' })).toBe(data);
    expect(resolveLot(data, 'lot-1', { navDate: d('2026-10-09'), nav: '88.92580' })).toBe(data);
    expect(resolveLot(data, 'missing', { navDate: d('2026-10-09'), nav: '88.92580' })).toBe(data);
  });
});

describe('newLotId', () => {
  it('combines the clock and a random suffix', () => {
    expect(newLotId(0, () => 0)).toBe('0-0');
    expect(newLotId(1_760_000_000_000, () => 0.5)).toBe(`${(1_760_000_000_000).toString(36)}-${(500_000_000).toString(36)}`);
    expect(newLotId(1, () => 0.1)).not.toBe(newLotId(1, () => 0.2));
  });
});
