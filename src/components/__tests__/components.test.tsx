import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { VALUE_SCALE } from '../../domain/decimal';
import type { IsoDate, NavPoint, SchemeMeta } from '../../domain/types';
import { latestNavQuery, recentNavQuery } from '../../query/hooks';
import { usePreferencesStore } from '../../store/preferencesStore';
import { ChangeChip } from '../ui/ChangeChip';
import { MoneyHero } from '../ui/MoneyHero';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { WatchRow } from '../watchlist/WatchRow';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Icons need the font loader (and expo-asset), which tests don't: they render as nothing here.
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
require('react-native-gesture-handler/jestSetup');

const rupees = (value: bigint) => value * 10n ** BigInt(VALUE_SCALE - 2);
const MINUS = '−';

beforeEach(() => {
  usePreferencesStore.setState({ hideAmounts: false });
});

describe('signed amounts', () => {
  it('reads a loss with a true minus sign, and says "loss" to a screen reader', async () => {
    await render(<SignedAmount value={rupees(-176324n)} scale={VALUE_SCALE} />);
    const amount = screen.getByText(`${MINUS}₹1,763.24`);
    expect(amount.props.accessibilityLabel).toMatch(/^loss of ₹1,763\.24/);
  });

  it('gives a gain a plus sign and the word "gain"', async () => {
    await render(<SignedAmount value={rupees(176324n)} scale={VALUE_SCALE} />);
    expect(screen.getByText('+₹1,763.24').props.accessibilityLabel).toMatch(/^gain of ₹1,763\.24/);
  });
});

describe('hero money and change chips', () => {
  it('sets the rupees large but reads the whole amount, and hides it with the eye', async () => {
    await render(<MoneyHero value={rupees(69821458n)} scale={VALUE_SCALE} />);
    expect(screen.getByLabelText('₹6,98,214.58')).toBeTruthy();
    expect(screen.getByText('6,98,214', { exact: false })).toBeTruthy();
    await cleanup();
    usePreferencesStore.setState({ hideAmounts: true });
    await render(<MoneyHero value={rupees(69821458n)} scale={VALUE_SCALE} />);
    expect(screen.getByLabelText('Amount hidden')).toBeTruthy();
    expect(screen.queryByText(/6,98,214/)).toBeNull();
  });

  it('prints a loss chip with minus signs and says "loss of" and "down"', async () => {
    await render(<ChangeChip amount={rupees(-47540n)} scale={VALUE_SCALE} pctHundredths={-58n} />);
    expect(screen.getByText(`${MINUS}₹475.40 · ${MINUS}0.58%`)).toBeTruthy();
    expect(screen.getByLabelText('loss of ₹475.40, down 0.58%')).toBeTruthy();
  });

  it('keeps the percentage but hides your own rupees in a gain chip', async () => {
    usePreferencesStore.setState({ hideAmounts: true });
    await render(<ChangeChip amount={rupees(13121458n)} scale={VALUE_SCALE} pctHundredths={2314n} private />);
    expect(screen.getByText('••••• · +23.14%')).toBeTruthy();
    expect(screen.getByLabelText('gain, amount hidden, up 23.14%')).toBeTruthy();
  });
});

describe('hidden amounts', () => {
  it('replaces your own rupees with dots while percentages stay', async () => {
    usePreferencesStore.setState({ hideAmounts: true });
    await render(
      <>
        <PrivateAmount value={rupees(1115414n)} scale={VALUE_SCALE} />
        <SignedAmount value={rupees(176324n)} scale={VALUE_SCALE} private />
        <SignedPercent hundredths={1878n} />
      </>,
    );
    expect(screen.queryByText('₹11,154.14')).toBeNull();
    expect(screen.queryByText('+₹1,763.24')).toBeNull();
    expect(screen.getAllByText('•••••')).toHaveLength(2);
    expect(screen.getByLabelText('Amount hidden')).toBeTruthy();
    expect(screen.getByText('+18.78%')).toBeTruthy();
  });
});

describe('a watchlist row', () => {
  const meta: SchemeMeta = {
    schemeCode: 122639,
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    fundHouse: 'PPFAS Mutual Fund',
    schemeType: 'Open Ended Schemes',
    schemeCategory: 'Equity Scheme - Flexi Cap Fund',
    isinGrowth: 'INF879O01027',
    isinDivReinvestment: null,
  };
  const point = (date: string, nav: string): NavPoint => ({ date: date as IsoDate, nav, value: Number(nav) });
  const item = { schemeCode: 122639, schemeName: meta.schemeName, addedAt: '2026-10-11T00:00:00.000Z' };

  // Cleared after each test: a cached query keeps a garbage-collection timer (7 days for
  // persisted NAVs), and Jest would wait for it.
  const clients: QueryClient[] = [];
  function withCache(latest: NavPoint, recent: NavPoint[]) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    clients.push(client);
    client.setQueryData(latestNavQuery(122639).queryKey, { meta, point: latest });
    client.setQueryData(recentNavQuery(122639).queryKey, { meta, points: recent, skipped: 0 });
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    // 11 Oct 2026, 12:00 in India.
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 11, 6, 30));
  });
  afterEach(async () => {
    // Unmount first: unmounting schedules each query's garbage-collection timer, which clear() then cancels.
    await cleanup();
    jest.restoreAllMocks();
    for (const client of clients.splice(0)) client.clear();
  });

  it('shows the NAV with its date and the day’s change', async () => {
    const latest = point('2026-10-09', '88.92580');
    await render(<WatchRow item={item} onRemove={() => undefined} />, {
      wrapper: withCache(latest, [point('2026-10-08', '87.65550'), latest]),
    });
    expect(screen.getByText('₹88.9258')).toBeTruthy();
    expect(screen.getByText('as of 09 Oct 2026')).toBeTruthy();
    expect(screen.getByText('+₹1.2703 (+1.45%)')).toBeTruthy();
    expect(screen.queryByText('Stale')).toBeNull();
  });

  it('turns Stale when the latest NAV is more than 7 days old, instead of showing an old day’s move', async () => {
    const latest = point('2026-10-02', '88.00000');
    await render(<WatchRow item={item} onRemove={() => undefined} />, {
      wrapper: withCache(latest, [point('2026-10-01', '87.00000'), latest]),
    });
    expect(screen.getByText('Stale')).toBeTruthy();
    expect(screen.getByText('as of 02 Oct 2026')).toBeTruthy();
    expect(screen.queryByText(/\(\+/)).toBeNull();
  });
});
