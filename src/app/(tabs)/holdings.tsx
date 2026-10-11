import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
} from 'react-native';

import { AllocationCard } from '@/components/holdings/AllocationCard';
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
import { IconButton } from '@/components/ui/IconButton';
import { PrivateAmount } from '@/components/ui/PrivateAmount';
import { LargeTitle, ScreenHeader, TopBar, useCollapsingTitle } from '@/components/ui/ScreenHeader';
import { Term } from '@/components/ui/Term';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { SignedAmount } from '@/components/ui/SignedAmount';
import { SignedPercent } from '@/components/ui/SignedPercent';
import { formatAsOf } from '@/domain/dates';
import type { GlossaryKey } from '@/domain/glossary';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatPercent } from '@/domain/format';
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
import { describeScheme } from '@/domain/schemeName';
import { detectSip } from '@/domain/sip';
import { evaluateLot, summarize, type LotStatus } from '@/domain/valuation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { latestNavQuery, queryKeys, recentNavQuery } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';
import { haptic } from '@/components/ui/haptics';

const keyExtractor = (fund: FundHolding) => String(fund.schemeCode);

export default function HoldingsScreen() {
  const { colors, radius, spacing } = useTheme();
  const lots = usePortfolioStore((s) => s.lots);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const removeLot = usePortfolioStore((s) => s.removeLot);
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

  // Lots are few and the maths is cheap, so this runs on every render.
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
  const funds = sortHoldings(holdingsByFund(evaluated), sortBy, direction, changes);
  const fundDayGains = new Map(
    funds.map((fund) => [
      fund.schemeCode,
      portfolioDayGain([fund], new Map([[fund.schemeCode, changes.get(fund.schemeCode) ?? null]])),
    ]),
  );
  const sips = new Map(
    codes.map((code) => [code, detectSip(lots.filter((lot) => lot.schemeCode === code))?.amountRupees ?? null]),
  );
  const dayGain = portfolioDayGain(funds, changes);
  const totals = summarize(statuses);
  const xirr = annualisedReturn(evaluated);
  const slices = allocation(funds);
  const classSlices = allocationByAssetClass(funds, (fund) =>
    assetClassOf(byCode.get(fund.schemeCode)?.data?.meta.schemeCategory ?? null, fund.schemeName),
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
        Alert.alert(`Remove ${title}?`, `This removes ${what} of this fund. It can't be undone.`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              for (const lot of lots) if (lot.schemeCode === fund.schemeCode) removeLot(lot.id);
              resolve(true);
            },
          },
        ]);
      }),
    [lots, removeLot],
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
  const renderItem = useCallback<ListRenderItem<FundHolding>>(
    ({ item }) => (
      <FundHoldingRow
        fund={item}
        nav={navState.get(item.schemeCode) ?? 'loading'}
        column={column}
        dayGain={fundDayGains.get(item.schemeCode) ?? null}
        sipRupees={sips.get(item.schemeCode) ?? null}
        onRetry={onRetry}
        onRemove={onRemove}
      />
    ),
    [navState, column, fundDayGains, sips, onRetry, onRemove],
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
            <Button label="Restore from a backup" variant="ghost" onPress={() => router.push('/backup')} />
          </EmptyState>
        </View>
      </View>
    );
  }

  const columnIndex = HOLDING_COLUMNS.findIndex((c) => c.key === column);
  const nextColumn = HOLDING_COLUMNS[(columnIndex + 1) % HOLDING_COLUMNS.length] ?? HOLDING_COLUMNS[0];
  const columnLabel = HOLDING_COLUMNS[columnIndex]?.label ?? '';
  const sortOption = SORT_OPTIONS.find((option) => option.key === sortBy) ?? SORT_OPTIONS[0];

  const asOf = totals.oldestNavDate !== null ? formatAsOf(totals.oldestNavDate, totals.newestNavDate) : undefined;
  const summary = (
    <View onLayout={onHeaderLayout}>
      <LargeTitle title="Holdings" subtitle={asOf !== undefined ? `NAVs ${asOf}` : undefined} />
      <View
        style={[
          styles.summary,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            margin: spacing.lg,
            padding: spacing.lg,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <AppText variant="label" tone="muted" style={styles.flex}>
            {funds.length === 1 ? '1 fund' : `${funds.length} funds`} · current value
          </AppText>
        </View>
        {anyFirstLoad ? (
          // Never show partial totals while a fund's latest NAV is still on its first load.
          <View accessible accessibilityLabel="Loading totals" style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <Skeleton width={200} height={34} />
            <Skeleton width={240} height={16} />
          </View>
        ) : (
          <>
            <PrivateAmount value={totals.current} scale={VALUE_SCALE} variant="figure" />
            <View style={[styles.rule, { borderColor: colors.border, marginVertical: spacing.md }]} />
            <View style={{ gap: spacing.sm }}>
              <Row label="1D returns" term="oneDay">
                {dayGain !== null ? (
                  <View style={[styles.inline, { gap: spacing.xs }]}>
                    <SignedAmount value={dayGain.amount} scale={VALUE_SCALE} variant="label" private />
                    <SignedPercent hundredths={dayGain.pctHundredths} variant="label" />
                  </View>
                ) : (
                  <AppText variant="label" tone="muted">
                    —
                  </AppText>
                )}
              </Row>
              <Row label="Total returns">
                <View style={[styles.inline, { gap: spacing.xs }]}>
                  <SignedAmount value={totals.gain} scale={VALUE_SCALE} variant="label" private />
                  {totals.returnHundredths !== null && (
                    <SignedPercent hundredths={totals.returnHundredths} variant="label" />
                  )}
                </View>
              </Row>
              <Row label="Invested">
                <PrivateAmount value={totals.invested} scale={VALUE_SCALE} variant="label" />
              </Row>
              <Row label="XIRR" term="xirr">
                {xirr !== null ? (
                  <AppText
                    variant="label"
                    numeric
                    tone={xirr > 0 ? 'gain' : xirr < 0 ? 'loss' : 'muted'}
                    accessibilityLabel={`${formatPercent(xirr)} per year`}
                  >
                    {formatPercent(xirr)} a year
                  </AppText>
                ) : (
                  <AppText variant="label" tone="muted">
                    after your first year
                  </AppText>
                )}
              </Row>
            </View>
            <View style={[styles.rule, { borderColor: colors.border, marginVertical: spacing.md }]} />
            <AllocationCard byClass={classSlices} byFund={slices} />
          </>
        )}
        {excluded > 0 && (
          <View style={{ marginTop: spacing.md }}>
            <AppText variant="caption" tone="warning">
              {[
                totals.pendingCount > 0 ? `${totals.pendingCount} awaiting NAV` : null,
                totals.unavailableCount > 0 ? `${totals.unavailableCount} not loaded` : null,
              ]
                .filter((part): part is string => part !== null)
                .join(' and ')}{' '}
              {excluded === 1 ? "isn't" : "aren't"} in these totals.
            </AppText>
          </View>
        )}
      </View>

      {/* One figure per row keeps the list calm; this switches which one. */}
      {/* Groww's layout: how the list is ordered on the left, which figure the rows show on the right. */}
      <View style={[styles.listHeader, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
        <Pressable
          onPress={() => setSorting(true)}
          accessibilityRole="button"
          accessibilityLabel={`Sorted by ${sortOption.label}, ${directionLabels(sortBy)[direction]}. Change sort`}
          hitSlop={12}
          style={[styles.inline, { gap: spacing.xs }]}
        >
          <Ionicons name="swap-vertical" size={14} color={colors.primary} />
          <AppText variant="label" tone="primary" numberOfLines={1}>
            {sortOption.short}
          </AppText>
          <Ionicons name={direction === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} color={colors.primary} />
        </Pressable>
        <View style={styles.flex} />
        <Pressable
          onPress={() => setColumn(nextColumn.key)}
          accessibilityRole="button"
          accessibilityLabel={`Showing ${columnLabel}. Switch to ${nextColumn.label}`}
          hitSlop={12}
          style={[styles.inline, { gap: spacing.xs }]}
        >
          <Ionicons name="code-outline" size={14} color={colors.primary} />
          <AppText variant="label" tone="primary" style={[styles.dotted, { borderBottomColor: colors.primary }]}>
            {columnLabel}
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <TopBar
        title="Holdings"
        scrollY={scrollY}
        right={
          <IconButton
            name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            onPress={() => {
              haptic.tap();
              toggleHideAmounts();
            }}
            selected={hideAmounts}
            accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
          />
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
            <AppText variant="caption" tone="muted">
              Values use each fund's latest published NAV. Returns are absolute; XIRR is the yearly rate across
              purchases made on different dates, shown once your oldest purchase is a year old. Totals are summed before
              rounding, so they can differ from the rows by a paisa.
            </AppText>
            <AppText variant="caption" tone="muted">
              Your holdings are saved on this phone, nowhere else. Swipe a fund left to remove it.
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

function Row({ label, term, children }: { label: string; term?: GlossaryKey; children: ReactNode }) {
  return (
    <View style={styles.kv}>
      <View style={styles.flex}>
        {term !== undefined ? (
          <Term term={term} label={label} />
        ) : (
          <AppText variant="label" tone="muted">
            {label}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: 'center' },
  summary: { borderWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  rule: { borderTopWidth: 1, borderStyle: 'dashed' },
  kv: { flexDirection: 'row', alignItems: 'center', minHeight: 22 },
  inline: { flexDirection: 'row', alignItems: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center' },
  // A dotted underline marks the column label as tappable, as Groww does.
  dotted: { borderBottomWidth: 1, borderStyle: 'dashed' },
});
