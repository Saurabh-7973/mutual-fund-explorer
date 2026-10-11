import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { IsoDate, NavPoint } from '../../domain/types';
import type { HoldingLot } from '../../store/portfolioSchema';
import { usePortfolioStore } from '../../store/portfolioStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { FundLots } from '../fund/FundLots';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() } }));
require('react-native-gesture-handler/jestSetup');

const NAME = 'HDFC Mid Cap Fund - Direct Plan - Growth Option';
const d = (value: string) => value as IsoDate;
const instalment = (date: string, units: string, nav: string): HoldingLot => ({
  id: date,
  schemeCode: 118989,
  schemeName: NAME,
  units,
  purchaseDate: d(date),
  applied: { navDate: d(date), nav },
  amount: '5000',
  createdAt: '2026-10-11T00:00:00.000Z',
});
const last: NavPoint = { date: d('2026-10-09'), nav: '219.81600', value: 219.816 };

let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 11, 6, 30));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  usePreferencesStore.setState({ hideAmounts: false });
  usePortfolioStore.setState({
    watchlist: [],
    lots: [
      instalment('2026-06-10', '22.8825', '218.50800'),
      instalment('2026-07-10', '21.5545', '231.97000'),
      instalment('2026-08-10', '21.1121', '236.83100'),
    ],
  });
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  client.clear();
});

describe('Your investment, with a running SIP', () => {
  it('says which instalments are missing from the next one due, not the last one bought', async () => {
    await render(<FundLots schemeCode={118989} last={last} category="Equity Scheme - Mid Cap Fund" schemeName={NAME} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByText('SIP of ₹5,000 on the 10th of each month')).toBeTruthy();
    expect(screen.getByText("Instalments from 10 Sep 2026 aren't recorded yet.")).toBeTruthy();
    expect(screen.queryByText(/since 10 Aug 2026/)).toBeNull();
    expect(screen.getByText('Add instalments due')).toBeTruthy();
  });
});
