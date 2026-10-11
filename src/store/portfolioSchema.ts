import { NAV_SCALE, UNITS_SCALE, parseScaled } from '../domain/decimal';
import { parseIsoDate } from '../domain/dates';
import { parseAmount } from '../domain/valuation';
import type { AppliedNav, IsoDate } from '../domain/types';

export type { AppliedNav };

/**
 * What the app saves on the device, plus pure transitions over it.
 * The Zustand store calls these functions, so the rules are unit-tested
 * without React or AsyncStorage. Everything here is JSON-safe (no BigInt).
 */

export const PORTFOLIO_STORAGE_KEY = 'mfx.portfolio';
export const PORTFOLIO_VERSION = 1;

export interface WatchItem {
  schemeCode: number;
  schemeName: string;
  /** ISO timestamp. */
  addedAt: string;
}

/** One purchase. `applied` is null while the NAV for its date is unpublished ("Awaiting NAV"). */
export interface HoldingLot {
  id: string;
  schemeCode: number;
  schemeName: string;
  /** Canonical decimal string, at most 4 decimals, e.g. "125.432". */
  units: string;
  purchaseDate: IsoDate;
  applied: AppliedNav | null;
  /**
   * Rupees paid, up to 2 decimals ("5000", "9390.91"): saved for SIP instalments and when
   * typed from a statement. Absent for purchases entered by units alone (and for data saved
   * before this field existed); those count units × NAV as invested.
   */
  amount?: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface PortfolioData {
  watchlist: WatchItem[];
  lots: HoldingLot[];
}

export const EMPTY_PORTFOLIO: PortfolioData = { watchlist: [], lots: [] };

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function sanitizeWatchItem(value: unknown): WatchItem | null {
  if (!isObject(value) || !isPositiveInt(value.schemeCode) || !isNonEmptyString(value.schemeName)) return null;
  return {
    schemeCode: value.schemeCode,
    schemeName: value.schemeName,
    addedAt: isNonEmptyString(value.addedAt) ? value.addedAt : new Date(0).toISOString(),
  };
}

function sanitizeApplied(value: unknown): AppliedNav | null | undefined {
  if (value === null) return null;
  if (!isObject(value) || typeof value.navDate !== 'string' || typeof value.nav !== 'string') return undefined;
  const navDate = parseIsoDate(value.navDate);
  const nav = parseScaled(value.nav, NAV_SCALE);
  if (navDate === null || nav === null || nav <= 0n) return undefined;
  return { navDate, nav: value.nav };
}

function sanitizeLot(value: unknown): HoldingLot | null {
  if (!isObject(value)) return null;
  if (!isNonEmptyString(value.id) || !isPositiveInt(value.schemeCode) || !isNonEmptyString(value.schemeName)) return null;
  if (typeof value.units !== 'string' || typeof value.purchaseDate !== 'string') return null;
  const units = parseScaled(value.units, UNITS_SCALE);
  const purchaseDate = parseIsoDate(value.purchaseDate);
  const applied = sanitizeApplied(value.applied);
  if (units === null || units <= 0n || purchaseDate === null || applied === undefined) return null;
  // A NAV that applies before the purchase date breaks the purchase rule: treat the row as corrupt.
  if (applied !== null && applied.navDate < purchaseDate) return null;
  // A bad amount loses only the amount: the purchase still counts, at units × NAV.
  const amount = typeof value.amount === 'string' && parseAmount(value.amount) !== null ? value.amount : undefined;
  return {
    id: value.id,
    schemeCode: value.schemeCode,
    schemeName: value.schemeName,
    units: value.units,
    purchaseDate,
    applied,
    ...(amount !== undefined ? { amount } : {}),
    createdAt: isNonEmptyString(value.createdAt) ? value.createdAt : new Date(0).toISOString(),
  };
}

/**
 * Validates whatever was read from storage. Corrupt rows are dropped instead of
 * crashing the app; duplicates are removed (first one wins).
 */
export function sanitizePortfolio(input: unknown): PortfolioData {
  if (!isObject(input)) return { watchlist: [], lots: [] };
  const watchlist: WatchItem[] = [];
  const seenCodes = new Set<number>();
  for (const raw of Array.isArray(input.watchlist) ? input.watchlist : []) {
    const item = sanitizeWatchItem(raw);
    if (item === null || seenCodes.has(item.schemeCode)) continue;
    seenCodes.add(item.schemeCode);
    watchlist.push(item);
  }
  const lots: HoldingLot[] = [];
  const seenIds = new Set<string>();
  for (const raw of Array.isArray(input.lots) ? input.lots : []) {
    const lot = sanitizeLot(raw);
    if (lot === null || seenIds.has(lot.id)) continue;
    seenIds.add(lot.id);
    lots.push(lot);
  }
  return { watchlist, lots };
}

export function isWatched(data: PortfolioData, schemeCode: number): boolean {
  return data.watchlist.some((item) => item.schemeCode === schemeCode);
}

/** Newest first. Adding an already-watched scheme changes nothing. */
export function addWatch(data: PortfolioData, item: WatchItem): PortfolioData {
  if (isWatched(data, item.schemeCode)) return data;
  return { ...data, watchlist: [item, ...data.watchlist] };
}

export function removeWatch(data: PortfolioData, schemeCode: number): PortfolioData {
  if (!isWatched(data, schemeCode)) return data;
  return { ...data, watchlist: data.watchlist.filter((item) => item.schemeCode !== schemeCode) };
}

/** Puts a removed item back where it was (for Undo). */
export function restoreWatch(data: PortfolioData, item: WatchItem, index: number): PortfolioData {
  if (isWatched(data, item.schemeCode)) return data;
  const at = Math.max(0, Math.min(index, data.watchlist.length));
  return { ...data, watchlist: [...data.watchlist.slice(0, at), item, ...data.watchlist.slice(at)] };
}

export function addLot(data: PortfolioData, lot: HoldingLot): PortfolioData {
  if (data.lots.some((existing) => existing.id === lot.id)) return data;
  return { ...data, lots: [...data.lots, lot] };
}

export function removeLot(data: PortfolioData, id: string): PortfolioData {
  return { ...data, lots: data.lots.filter((lot) => lot.id !== id) };
}

/** Fills in the NAV for an "Awaiting NAV" lot. Lots that already have one are left alone. */
export function resolveLot(data: PortfolioData, id: string, applied: AppliedNav): PortfolioData {
  let changed = false;
  const lots = data.lots.map((lot) => {
    if (lot.id !== id || lot.applied !== null || applied.navDate < lot.purchaseDate) return lot;
    changed = true;
    return { ...lot, applied };
  });
  return changed ? { ...data, lots } : data;
}

/** Time-based id with a random suffix; ample for one person's lots. */
export function newLotId(nowMs: number = Date.now(), random: () => number = Math.random): string {
  return `${nowMs.toString(36)}-${Math.floor(random() * 1e9).toString(36)}`;
}
