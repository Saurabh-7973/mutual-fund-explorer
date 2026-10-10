import { useQueries, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View, type LayoutChangeEvent, type ListRenderItem } from 'react-native';

import { LOT_ROW_HEIGHT, LotRow, lotUnitsText, type LotRowState } from '@/components/holdings/LotRow';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton';
import { SignedAmount } from '@/components/ui/SignedAmount';
import { SignedPercent } from '@/components/ui/SignedPercent';
import { formatAsOf, formatDate } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr } from '@/domain/format';
import { sortLots } from '@/domain/holdings';
import { describeScheme } from '@/domain/schemeName';
import { evaluateLot, summarize, type LotStatus } from '@/domain/valuation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { latestNavQuery, queryKeys } from '@/query/hooks';
import type { HoldingLot } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTheme } from '@/theme/useTheme';

const keyExtractor = (lot: HoldingLot) => lot.id;

export default function HoldingsScreen() {
  const { colors, spacing } = useTheme();
  const lots = usePortfolioStore((s) => s.lots);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const removeLot = usePortfolioStore((s) => s.removeLot);
  const queryClient = useQueryClient();
  useRefreshOnFocus('nav-latest');

  const [refreshing, setRefreshing] = useState(false);
  // The summary card is the list header; its height feeds getItemLayout so row offsets stay exact.
  const [headerHeight, setHeaderHeight] = useState(0);

  const sorted = useMemo(() => sortLots(lots), [lots]);
  const codes = useMemo(() => [...new Set(lots.map((lot) => lot.schemeCode))], [lots]);
  const results = useQueries({ queries: codes.map((code) => latestNavQuery(code)) });
  const byCode = new Map(codes.map((code, i) => [code, results[i]]));

  // Lots are few and the maths is cheap, so this runs on every render.
  const rowStates = new Map<string, LotRowState>();
  const statuses: LotStatus[] = [];
  let anyFirstLoad = false;
  for (const lot of sorted) {
    const result = byCode.get(lot.schemeCode);
    let status: LotStatus;
    let state: LotRowState;
    if (lot.applied === null) {
      status = { status: 'pending' };
      state = { kind: 'pending' };
    } else if (result?.data === undefined) {
      status = { status: 'unavailable' };
      const loading = result?.isLoading ?? true;
      if (loading) anyFirstLoad = true;
      state = loading ? { kind: 'loading' } : { kind: 'failed' };
    } else {
      status = evaluateLot(lot, result.data.point);
      state = status.status === 'valued' ? { kind: 'valued', valuation: status.valuation } : { kind: 'failed' };
    }
    statuses.push(status);
    rowStates.set(lot.id, state);
  }
  const totals = summarize(statuses);
  const excluded = totals.pendingCount + totals.unavailableCount;

  const onRetry = useCallback(
    (schemeCode: number) => void queryClient.refetchQueries({ queryKey: queryKeys.latest(schemeCode) }),
    [queryClient],
  );
  const onRemove = useCallback(
    (lot: HoldingLot) => {
      const title = describeScheme(lot.schemeName).title;
      Alert.alert(
        'Remove holding?',
        `${lotUnitsText(lot.units)} units of ${title}, bought ${formatDate(lot.purchaseDate)}. This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeLot(lot.id) },
        ],
      );
    },
    [removeLot],
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
    (_data: ArrayLike<HoldingLot> | null | undefined, index: number) => ({
      length: LOT_ROW_HEIGHT,
      offset: headerHeight + LOT_ROW_HEIGHT * index,
      index,
    }),
    [headerHeight],
  );

  const renderItem = useCallback<ListRenderItem<HoldingLot>>(
    ({ item }) => (
      <LotRow lot={item} state={rowStates.get(item.id) ?? { kind: 'loading' }} onRetry={onRetry} onRemove={onRemove} />
    ),
    [rowStates, onRetry, onRemove],
  );

  if (!hydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: spacing.md }]}>
        <SkeletonRows rowHeight={LOT_ROW_HEIGHT} count={4} />
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
    <View onLayout={onHeaderLayout} style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
      <Card style={{ gap: spacing.sm }}>
        <AppText variant="label" tone="muted">
          Current value
        </AppText>
        {anyFirstLoad ? (
          // Never show partial totals while a fund's latest NAV is still on its first load.
          <View accessible accessibilityLabel="Loading totals" style={{ gap: spacing.sm }}>
            <Skeleton width={180} height={30} />
            <Skeleton width={140} height={16} />
            <Skeleton width={160} height={16} />
          </View>
        ) : (
          <>
            <AppText variant="figure" numeric>
              {formatInr(totals.current, VALUE_SCALE)}
            </AppText>
            <AppText variant="label" tone="muted" numeric>
              Invested {formatInr(totals.invested, VALUE_SCALE)}
            </AppText>
            <View style={[styles.inline, { gap: spacing.sm }]}>
              <AppText variant="label" tone="muted">
                Gain
              </AppText>
              <SignedAmount value={totals.gain} scale={VALUE_SCALE} variant="label" />
              {totals.returnHundredths !== null && (
                <SignedPercent hundredths={totals.returnHundredths} variant="label" />
              )}
            </View>
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
                {excluded === 1 ? "isn't" : "aren't"} included in these totals.
              </AppText>
            )}
          </>
        )}
      </Card>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        // Row states change when NAVs load even though the lots don't.
        extraData={rowStates}
        ListHeaderComponent={summary}
        ListFooterComponent={
          <AppText variant="caption" tone="muted" style={{ padding: spacing.lg }}>
            Values use each fund's latest published NAV. Return is absolute; p.a. (CAGR) appears for holdings of a year
            or more. Totals are summed before rounding, so they can differ from the rows by a paisa.
          </AppText>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
