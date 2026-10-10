import { useQueries, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View, type LayoutChangeEvent, type ListRenderItem } from 'react-native';

import { AllocationBar } from '@/components/holdings/AllocationBar';
import { FUND_HOLDING_ROW_HEIGHT, FundHoldingRow, type FundRowNav } from '@/components/holdings/FundHoldingRow';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { SignedAmount } from '@/components/ui/SignedAmount';
import { SignedPercent } from '@/components/ui/SignedPercent';
import { formatAsOf } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent } from '@/domain/format';
import { allocation, annualisedReturn, holdingsByFund, type EvaluatedLot, type FundHolding } from '@/domain/holdings';
import { describeScheme } from '@/domain/schemeName';
import { evaluateLot, summarize, type LotStatus } from '@/domain/valuation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { latestNavQuery, queryKeys } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTheme } from '@/theme/useTheme';

const keyExtractor = (fund: FundHolding) => String(fund.schemeCode);

export default function HoldingsScreen() {
  const { colors, spacing } = useTheme();
  const lots = usePortfolioStore((s) => s.lots);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const removeLot = usePortfolioStore((s) => s.removeLot);
  const queryClient = useQueryClient();
  useRefreshOnFocus('nav-latest');

  const [refreshing, setRefreshing] = useState(false);
  // The summary is the list header; its height feeds getItemLayout so row offsets stay exact.
  const [headerHeight, setHeaderHeight] = useState(0);

  const codes = useMemo(() => [...new Set(lots.map((lot) => lot.schemeCode))], [lots]);
  const results = useQueries({ queries: codes.map((code) => latestNavQuery(code)) });
  const byCode = new Map(codes.map((code, i) => [code, results[i]]));

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
  const funds = holdingsByFund(evaluated);
  const totals = summarize(statuses);
  const xirr = annualisedReturn(evaluated);
  const slices = allocation(funds);
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
      <FundHoldingRow fund={item} nav={navState.get(item.schemeCode) ?? 'loading'} onRetry={onRetry} onRemove={onRemove} />
    ),
    [navState, onRetry, onRemove],
  );

  if (!hydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: spacing.md }]}>
        <SkeletonRows rowHeight={FUND_HOLDING_ROW_HEIGHT} count={4} />
      </View>
    );
  }

  if (lots.length === 0) {
    return (
      <View style={[styles.flex, styles.centered, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="briefcase-outline"
          title="No holdings yet"
          body="Record a purchase from any fund's page to see its value and return here."
          action={{ label: 'Find a fund', onPress: () => router.navigate('/') }}
        />
      </View>
    );
  }

  const summary = (
    <View
      onLayout={onHeaderLayout}
      style={[
        styles.summary,
        { backgroundColor: colors.surface, borderBottomColor: colors.border, padding: spacing.lg, gap: spacing.md },
      ]}
    >
      <View style={{ gap: spacing.xs }}>
        <AppText variant="label" tone="muted">
          Current value
        </AppText>
        {anyFirstLoad ? (
          // Never show partial totals while a fund's latest NAV is still on its first load.
          <View accessible accessibilityLabel="Loading totals" style={{ gap: spacing.sm }}>
            <Skeleton width={200} height={34} />
            <Skeleton width={240} height={16} />
          </View>
        ) : (
          <AppText variant="figure" numeric>
            {formatInr(totals.current, VALUE_SCALE)}
          </AppText>
        )}
      </View>

      {!anyFirstLoad && (
        <View style={[styles.stats, { gap: spacing.lg }]}>
          <Stat label="Invested">
            <AppText variant="heading" numeric>
              {formatInr(totals.invested, VALUE_SCALE)}
            </AppText>
          </Stat>
          <Stat label="Returns">
            <View style={[styles.inline, { gap: spacing.xs }]}>
              <SignedAmount value={totals.gain} scale={VALUE_SCALE} variant="heading" />
            </View>
            {totals.returnHundredths !== null && <SignedPercent hundredths={totals.returnHundredths} variant="label" />}
          </Stat>
          <Stat label="XIRR">
            {xirr !== null ? (
              <AppText
                variant="heading"
                numeric
                tone={xirr > 0 ? 'gain' : xirr < 0 ? 'loss' : 'muted'}
                accessibilityLabel={`${formatPercent(xirr)} per year`}
              >
                {formatPercent(xirr)}
              </AppText>
            ) : (
              <AppText variant="heading" tone="muted">
                —
              </AppText>
            )}
            <AppText variant="caption" tone="muted">
              {xirr !== null ? 'a year' : 'after 1 year'}
            </AppText>
          </Stat>
        </View>
      )}

      {!anyFirstLoad && <AllocationBar slices={slices} />}

      <View style={{ gap: 2 }}>
        {totals.oldestNavDate !== null && (
          <AppText variant="caption" tone="muted">
            {formatAsOf(totals.oldestNavDate, totals.newestNavDate)}
          </AppText>
        )}
        {excluded > 0 && (
          <AppText variant="caption" tone="warning">
            {[
              totals.pendingCount > 0 ? `${totals.pendingCount} awaiting NAV` : null,
              totals.unavailableCount > 0 ? `${totals.unavailableCount} not loaded` : null,
            ]
              .filter((part): part is string => part !== null)
              .join(' and ')}{' '}
            {excluded === 1 ? "isn't" : "aren't"} in these totals.
          </AppText>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={funds}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        // Row states change when NAVs load even though the funds' identity doesn't.
        extraData={navState}
        ListHeaderComponent={summary}
        ListFooterComponent={
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <AppText variant="caption" tone="muted">
              Values use each fund's latest published NAV. Returns are absolute; XIRR is the yearly rate across purchases
              made on different dates, shown once your oldest purchase is a year old. Totals are summed before rounding,
              so they can differ from the rows by a paisa.
            </AppText>
            <AppText variant="caption" tone="muted">
              Your holdings are saved on this phone, nowhere else.
            </AppText>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      />
    </View>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: 'center' },
  summary: { borderBottomWidth: StyleSheet.hairlineWidth },
  stats: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { gap: 2, minWidth: 92 },
  inline: { flexDirection: 'row', alignItems: 'baseline' },
});
