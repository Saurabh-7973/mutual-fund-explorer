import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { FundGate, InvalidSchemeLink, fundDisplayName, type FundReady } from '@/components/fund/FundGate';
import { FundLots } from '@/components/fund/FundLots';
import { FundTitle } from '@/components/fund/FundTitle';
import { LatestNavCard } from '@/components/fund/LatestNavCard';
import { NavChart } from '@/components/fund/NavChart';
import { NavRowView } from '@/components/fund/NavRows';
import { ReturnsCard } from '@/components/fund/ReturnsCard';
import { WatchToggle } from '@/components/search/WatchToggle';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/domain/dates';
import {
  CHART_RANGES,
  chartRangeLabel,
  defaultChartRange,
  navRowsNewestFirst,
  rangeCovered,
  sliceRange,
  type ChartRange,
} from '@/domain/nav';
import { parseSchemeCode } from '@/domain/search';
import { useFundSeries } from '@/query/hooks';
import { useTheme } from '@/theme/useTheme';

const RECENT_NAV_COUNT = 5;

export default function FundScreen() {
  const params = useLocalSearchParams<{ code: string; name?: string }>();
  const schemeCode = parseSchemeCode(params.code);
  if (schemeCode === null) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <InvalidSchemeLink />
      </>
    );
  }
  return <FundContent schemeCode={schemeCode} paramName={params.name} />;
}

function FundContent({ schemeCode, paramName }: { schemeCode: number; paramName: string | undefined }) {
  const { colors } = useTheme();
  const series = useFundSeries(schemeCode);
  const name = fundDisplayName(series, paramName, schemeCode);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{ title: '', headerRight: () => <WatchToggle schemeCode={schemeCode} schemeName={name} /> }}
      />
      <FundGate schemeCode={schemeCode} series={series} loading={<FundSkeleton />}>
        {(ready) => <FundBody ready={ready} series={series} schemeCode={schemeCode} name={name} />}
      </FundGate>
    </View>
  );
}

interface FundBodyProps {
  ready: FundReady;
  series: ReturnType<typeof useFundSeries>;
  schemeCode: number;
  name: string;
}

function FundBody({ ready, series, schemeCode, name }: FundBodyProps) {
  const { colors, spacing } = useTheme();
  const { history, points, last } = ready;
  const [chosenRange, setChosenRange] = useState<ChartRange | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const range = chosenRange ?? defaultChartRange(points);
  const months = CHART_RANGES.find((item) => item.key === range)?.months ?? null;
  const ranged = useMemo(() => sliceRange(points, months), [points, months]);
  const recent = useMemo(() => navRowsNewestFirst(points).slice(0, RECENT_NAV_COUNT), [points]);
  const coverage = useMemo(
    () => new Map(CHART_RANGES.map((item) => [item.key, rangeCovered(points, item.months)])),
    [points],
  );
  const first = points[0];

  const { history: historyQuery, latest: latestQuery } = series;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([historyQuery.refetch(), latestQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [historyQuery, latestQuery]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      <FundTitle name={name} schemeCode={schemeCode} meta={history.meta} />

      <LatestNavCard points={points} last={last} skipped={history.skipped} schemeCode={schemeCode} name={name} />

      <View style={{ gap: spacing.md }}>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {CHART_RANGES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={item.key === range}
              disabled={!coverage.get(item.key)}
              onPress={() => setChosenRange(item.key)}
            />
          ))}
        </View>
        <NavChart points={ranged} rangeLabel={chartRangeLabel(range, points)} />
      </View>

      <ReturnsCard points={points} />

      <FundLots schemeCode={schemeCode} name={name} last={last} />

      <Card style={[styles.flush, { gap: spacing.sm }]}>
        <AppText variant="heading" accessibilityRole="header" style={{ paddingHorizontal: spacing.lg }}>
          Recent NAVs
        </AppText>
        <View>
          {recent.map((row) => (
            <NavRowView key={row.date} row={row} />
          ))}
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Button
            label={`See all ${points.length} NAVs`}
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/fund/[code]/navs', params: { code: String(schemeCode), name } })
            }
          />
        </View>
      </Card>

      {first !== undefined && (
        <AppText variant="caption" tone="muted">
          Source: mfapi.in (AMFI data). Earliest NAV in the data: {formatDate(first.date)}. NAVs are published after
          market close; funds of funds and overseas funds publish a day later.
        </AppText>
      )}
    </ScrollView>
  );
}

function FundSkeleton() {
  const { spacing } = useTheme();
  return (
    <View accessible accessibilityLabel="Loading" style={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Skeleton width="80%" height={24} />
        <Skeleton width="50%" height={16} />
        <Skeleton width="35%" height={14} />
      </View>
      <Skeleton height={120} />
      <Skeleton height={200} />
      <View style={{ gap: spacing.sm }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={18} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  flush: { paddingHorizontal: 0, overflow: 'hidden' },
});
