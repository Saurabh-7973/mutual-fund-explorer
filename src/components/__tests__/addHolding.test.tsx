import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AddHoldingScreen from '../../app/add-holding';
import type { IsoDate, NavPoint, SchemeMeta } from '../../domain/types';
import { latestNavQuery, navHistoryQuery } from '../../query/hooks';
import { usePortfolioStore } from '../../store/portfolioStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: () => ({ code: '122639', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' }),
}));
require('react-native-gesture-handler/jestSetup');

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
const latest = point('2026-10-09', '88.92580');
const points = [point('2026-10-08', '87.65550'), latest];

let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  // The app's root supplies these; a test supplies them itself.
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 11, 6, 30));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(navHistoryQuery(122639).queryKey, { meta, points, skipped: 0 });
  client.setQueryData(latestNavQuery(122639).queryKey, { meta, point: latest });
  usePortfolioStore.setState({ watchlist: [], lots: [] });
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  client.clear();
});

describe('Add holding', () => {
  it('refuses units with a thousands comma, says why, and saves nothing', async () => {
    await render(<AddHoldingScreen />, { wrapper: Wrapper });
    await fireEvent.changeText(screen.getByLabelText('Units'), '1,254');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Enter digits only, without commas (for example 1254.321).')).toBeTruthy();
    expect(usePortfolioStore.getState().lots).toEqual([]);
  });

  it('asks for the purchase date instead of saving valid units without one', async () => {
    await render(<AddHoldingScreen />, { wrapper: Wrapper });
    await fireEvent.changeText(screen.getByLabelText('Units'), '125.432');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Choose the purchase date.')).toBeTruthy();
    expect(usePortfolioStore.getState().lots).toEqual([]);
  });
});
