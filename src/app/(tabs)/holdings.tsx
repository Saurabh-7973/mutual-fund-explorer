import { useQueries, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  RefreshControl,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
} from 'react-native';

import { HoldingsListHeader } from '@/components/holdings/HoldingsListHeader';
import { PortfolioSummary } from '@/components/holdings/PortfolioSummary';
import { SORT_OPTIONS, SortSheet, directionLabels } from '@/components/holdings/SortSheet';
import {
  FUND_HOLDING_ROW_HEIGHT,
  FundHoldingRow,
  HOLDING_COLUMNS,
  type FundRowNav,
  type HoldingColumn,
} from '@/components/holdings/FundHoldingRow';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadSampleButton, SampleBanner } from '@/components/holdings/SamplePortfolio';
import { IconButton } from '@/components/ui/IconButton';
import { LargeTitle, ScreenHeader, TopBar, useCollapsingTitle } from '@/components/ui/ScreenHeader';
import { Term } from '@/components/ui/Term';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { formatAsOf } from '@/domain/dates';
import {
  allocation,
  allocationByAssetClass,
  annualisedReturn,
  holdingsByFund,
  portfolioDayGain,
  sortHoldings,
  type EvaluatedLot,
  type HoldingSort,
  type SortDirection,
  type FundHolding,
} from '@/domain/holdings';
import { dayChange, type NavChange } from '@/domain/nav';
import { assetClassOf } from '@/domain/assetClass';
import { describeScheme, optionFromIsins } from '@/domain/schemeName';
import { detectSip } from '@/domain/sip';
import { evaluateLot, summarize, type LotStatus } from '@/domain/valuation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { latestNavQuery, queryKeys, recentNavQuery } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';
import { haptic } from '@/components/ui/haptics';
import { easeNextLayout } from '@/components/ui/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const keyExtractor = (fund: FundHolding) => String(fund.schemeCode);

export default function HoldingsScreen() {
  const { colors, radius, spacing } = useTheme();
  const lots = usePortfolioStore((s) => s.lots);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const removeLot = usePortfolioStore((s) => s.removeLot);
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  useRefreshOnFocus('nav-latest');

  const [refreshing, setRefreshing] = useState(false);
  // The summary is the list header; its height feeds getItemLayout so row offsets stay exact.
  const [headerHeight, setHeaderHeight] = useState(0);
  const [column, setColumn] = useState<HoldingColumn>('value');
  const [sortBy, setSortBy] = useState<HoldingSort>('value');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [sorting, setSorting] = useState(false);
  const { scrollY, onScroll } = useCollapsingTitle();
  const hideAmounts = usePreferencesStore((s) => s.hideAmounts);
  const toggleHideAmounts = usePreferencesStore((s) => s.toggleHideAmounts);

  const codes = useMemo(() => [...new Set(lots.map((lot) => lot.schemeCode))], [lots]);
  const results = useQueries({ queries: codes.map((code) => latestNavQuery(code)) });
  const byCode = new Map(codes.map((code, i) => [code, results[i]]));
  // Two weeks of NAVs per fund: enough for today's change (persisted with the latest NAV).
  const recents = useQueries({ queries: codes.map((code) => recentNavQuery(code)) });

  // Every figure on the screen, worked out once per change in the data it depends on: the
  // purchases, each fund's latest NAV and loading state, the recent NAVs. Renders
  // for anything else (the header measuring itself, the sort sheet opening) reuse it, and the
  // rows keep the same objects so their memo holds. A 600-purchase portfolio takes tens of
  // milliseconds to work out, so this matters.
  const latestKey = results
    .map((r) => `${r.data?.point?.date ?? ''}:${r.data?.point?.nav ?? ''}:${r.isLoading ? 'l' : r.isError ? 'e' : ''}`)
    .join('|');
  const recentKey = recents.map((r) => r.dataUpdatedAt).join('|');
  const { navState, changes, grouped, fundDayGains, sips, dayGain, totals, xirr, slices, classSlices } = useMemo(() => {
    const evaluated: EvaluatedLot[] = [];
    const statuses: LotStatus[] = [];
    const navState = new Map<number, FundRowNav>();
    for (const lot of lots) {
      const result = byCode.get(lot.schemeCode);
      const status = evaluateLot(lot, result?.data?.point);
      statuses.push(status);
      evaluated.push({ ...lot, status });
      if (lot.applied !== null && result?.data === undefined) {
        navState.set(lot.schemeCode, (result?.isLoading ?? true) ? 'loading' : 'failed');
      } else if (!navState.has(lot.schemeCode)) {
        navState.set(lot.schemeCode, 'ready');
      }
    }
    const changes = new Map<number, NavChange | null>(
      codes.map((code, i) => {
        const points = recents[i]?.data?.points;
        return [code, points === undefined ? null : dayChange(points, byCode.get(code)?.data?.point ?? null)];
      }),
    );
    // Largest value first, whatever the list's sort: allocation keeps the first four and folds the rest into Other.
    const grouped = holdingsByFund(evaluated);
    const fundDayGains = new Map(
      grouped.map((fund) => [
        fund.schemeCode,
        portfolioDayGain([fund], new Map([[fund.schemeCode, changes.get(fund.schemeCode) ?? null]])),
      ]),
    );
    const sips = new Map(
      codes.map((code) => [code, detectSip(lots.filter((lot) => lot.schemeCode === code))?.amountRupees ?? null]),
    );
    const dayGain = portfolioDayGain(grouped, changes);
    const totals = summarize(statuses);
    const xirr = annualisedReturn(evaluated);
    const slices = allocation(grouped);
    const classSlices = allocationByAssetClass(grouped, (fund) =>
      assetClassOf(byCode.get(fund.schemeCode)?.data?.meta.schemeCategory ?? null, fund.schemeName),
    );
    return { navState, changes, grouped, fundDayGains, sips, dayGain, totals, xirr, slices, classSlices };
    // results, recents and byCode are new arrays every render; their content is in the keys.
  }, [lots, codes, latestKey, recentKey]);
  // A new sort only reorders the rows; nothing else is worked out again.
  const funds = useMemo(() => sortHoldings(grouped, sortBy, direction, changes), [grouped, sortBy, direction, changes]);
  // Growth/IDCW from the ISINs, for schemes whose name doesn't say; stable between data changes.
  const isinOptions = useMemo(
    () =>
      new Map(
        codes.map((code) => {
          const meta = byCode.get(code)?.data?.meta;
          return [code, meta !== undefined ? optionFromIsins(meta.isinGrowth, meta.isinDivReinvestment) : null];
        }),
      ),
    [codes, latestKey], // byCode's content is in latestKey
  );
  const anyFirstLoad = [...navState.values()].includes('loading');
  const excluded = totals.pendingCount + totals.unavailableCount;

  const onRetry = useCallback(
    (schemeCode: number) => void queryClient.refetchQueries({ queryKey: queryKeys.latest(schemeCode) }),
    [queryClient],
  );
  const onRemove = useCallback(
    (fund: FundHolding) =>
      new Promise<boolean>((resolve) => {
        const title = describeScheme(fund.schemeName).title;
        const what = fund.lotCount === 1 ? 'your purchase' : `all ${fund.lotCount} purchases`;
        haptic.warn();
        Alert.alert(`Remove ${title}?`, `This removes ${what} of this fund. It can't be undone.`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              easeNextLayout(reduced);
              for (const lot of lots) if (lot.schemeCode === fund.schemeCode) removeLot(lot.id);
              resolve(true);
            },
          },
        ]);
      }),
    [lots, removeLot, reduced],
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['nav-latest'], type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);
  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setHeaderHeight((current) => (current === next ? current : next));
  }, []);
  const getItemLayout = useCallback(
    (_data: ArrayLike<FundHolding> | null | undefined, index: number) => ({
      length: FUND_HOLDING_ROW_HEIGHT,
      offset: headerHeight + FUND_HOLDING_ROW_HEIGHT * index,
      index,
    }),
    [headerHeight],
  );
  const lastIndex = funds.length - 1;
  const renderItem = useCallback<ListRenderItem<FundHolding>>(
    ({ item, index }) => (
      <FundHoldingRow
        first={index === 0}
        last={index === lastIndex}
        fund={item}
        nav={navState.get(item.schemeCode) ?? 'loading'}
        column={column}
        dayGain={fundDayGains.get(item.schemeCode) ?? null}
        sipRupees={sips.get(item.schemeCode) ?? null}
        isinOption={isinOptions.get(item.schemeCode) ?? null}
        onRetry={onRetry}
        onRemove={onRemove}
      />
    ),
    [navState, column, fundDayGains, sips, isinOptions, onRetry, onRemove, lastIndex],
  );

  if (!hydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Holdings" />
        <SkeletonRows rowHeight={FUND_HOLDING_ROW_HEIGHT} count={4} />
      </View>
    );
  }

  if (lots.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Holdings" />
        <View style={[styles.flex, styles.centered]}>
          <EmptyState
            icon="briefcase-outline"
            title="No holdings yet"
            body="Record a purchase from any fund's page to see its value and return here."
            action={{ label: 'Find a fund', onPress: () => router.navigate('/') }}
          >
            <LoadSampleButton />
            <Button label="Restore from a backup" variant="ghost" onPress={() => router.push('/backup')} />
          </EmptyState>
        </View>
      </View>
    );
  }

  const columnIndex = HOLDING_COLUMNS.findIndex((c) => c.key === column);
  const nextColumn = HOLDING_COLUMNS[(columnIndex + 1) % HOLDING_COLUMNS.length] ?? HOLDING_COLUMNS[0];
  const columnLabel = HOLDING_COLUMNS[columnIndex]?.label ?? '';
  const columnShort = HOLDING_COLUMNS[columnIndex]?.short ?? '';
  const sortOption = SORT_OPTIONS.find((option) => option.key === sortBy) ?? SORT_OPTIONS[0];

  const asOf = totals.oldestNavDate !== null ? formatAsOf(totals.oldestNavDate, totals.newestNavDate) : undefined;
  const summary = (
    <View onLayout={onHeaderLayout}>
      <LargeTitle
        title="Holdings"
        subtitle={[
          funds.length === 1 ? '1 fund' : `${funds.length} funds`,
          asOf === undefined ? null : asOf.startsWith('as of') ? `NAVs ${asOf}` : asOf,
        ]
          .filter((part): part is string => part !== null)
          .join(' · ')}
      />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <SampleBanner />
      </View>
      <PortfolioSummary
        fundCount={funds.length}
        loading={anyFirstLoad}
        totals={totals}
        dayGain={dayGain}
        xirr={xirr}
        classSlices={classSlices}
        slices={slices}
        excluded={excluded}
      />

      <HoldingsListHeader
        sortShort={sortOption.short}
        sortLabel={`${sortOption.label}, ${directionLabels(sortBy)[direction]}`}
        direction={direction}
        columnShort={columnShort}
        columnLabel={columnLabel}
        nextColumnLabel={nextColumn.label}
        onSort={() => setSorting(true)}
        onSwitchColumn={() => setColumn(nextColumn.key)}
      />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <TopBar
        title="Holdings"
        scrollY={scrollY}
        right={
          <View style={[styles.eye, { backgroundColor: colors.surface }]}>
            <IconButton
              name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.text}
              onPress={() => {
                haptic.tap();
                toggleHideAmounts();
              }}
              selected={hideAmounts}
              accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
            />
          </View>
        }
      />
      <Animated.FlatList
        data={funds}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        // Row states change when NAVs load even though the funds' identity doesn't.
        extraData={navState}
        ListHeaderComponent={summary}
        ListFooterComponent={
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Term term="howValued" label="How these figures are worked out" variant="caption" />
            <AppText variant="caption" tone="muted">
              Saved on this phone only. Swipe a fund left to remove it.
            </AppText>
            <Button
              label="Back up or restore your data"
              variant="ghost"
              icon="cloud-upload-outline"
              onPress={() => router.push('/backup')}
            />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      />
      <SortSheet
        visible={sorting}
        by={sortBy}
        direction={direction}
        onChange={(by, next) => {
          setSortBy(by);
          setDirection(next);
        }}
        onClose={() => setSorting(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: 'center' },
  eye: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
