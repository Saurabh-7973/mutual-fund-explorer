import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
// Both from Gesture Handler: its ScrollView waits on the refresh control's gesture, which only its own RefreshControl provides.
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';

import { FundGate, InvalidSchemeLink, fundDisplayName, type FundReady } from '@/components/fund/FundGate';
import { FundLots } from '@/components/fund/FundLots';
import { Consistency } from '@/components/fund/Consistency';
import { FundHero } from '@/components/fund/FundHero';
import { InvestReplay } from '@/components/fund/InvestReplay';
import { KeyFacts } from '@/components/fund/KeyFacts';
import { NavChart } from '@/components/fund/NavChart';
import { NavRowView } from '@/components/fund/NavRows';
import { ReturnsBars } from '@/components/fund/ReturnsBars';
import { WatchToggle } from '@/components/search/WatchToggle';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { SegmentedRow } from '@/components/ui/SegmentedRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatMonthYear } from '@/domain/dates';
import { formatInrCompact, formatPercent } from '@/domain/format';
import { VALUE_SCALE } from '@/domain/decimal';
import { maxDrawdown, replayInvestment, rollingReturns } from '@/domain/longTerm';
import { headlineReturn, trailingReturns } from '@/domain/returns';
import {
  CHART_RANGES,
  chartRangeLabel,
  defaultChartRange,
  navRowsNewestFirst,
  rangeCovered,
  sliceRange,
  type ChartRange,
} from '@/domain/nav';
import { describeScheme } from '@/domain/schemeName';
import { parseSchemeCode } from '@/domain/search';
import { useFundSeries } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // The header stays empty while the full title is on screen, then shows the short title.
  const [titleScrolledAway, setTitleScrolledAway] = useState(false);
  const shortTitle = describeScheme(name).title;
  const markViewed = usePreferencesStore((s) => s.markViewed);
  const knownName = series.history.data?.meta.schemeName ?? series.latest.data?.meta.schemeName ?? null;
  // Remember the fund for Explore's "Recently viewed" once its real name is known.
  useEffect(() => {
    if (knownName !== null) markViewed({ schemeCode, schemeName: knownName });
  }, [knownName, schemeCode, markViewed]);
  const headline = useMemo(
    () => (series.points === null ? null : headlineReturn(trailingReturns(series.points))),
    [series.points],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '',
          // Once the hero scrolls away, the header keeps the name and the headline return in view.
          headerTitle: () =>
            titleScrolledAway ? (
              <View>
                <AppText variant="heading" numberOfLines={1}>
                  {shortTitle}
                </AppText>
                {headline !== null && headline.percent !== null && (
                  <AppText variant="caption" tone={headline.percent >= 0 ? 'gain' : 'loss'} numeric>
                    {formatPercent(headline.percent)}{' '}
                    {headline.key === 'ALL' ? 'a year since start' : `${headline.key} annualised`}
                  </AppText>
                )}
              </View>
            ) : (
              // An empty view, not null: a title that renders nothing also hides the back button.
              <View />
            ),
          headerRight: () => <WatchToggle schemeCode={schemeCode} schemeName={name} />,
        }}
      />
      <FundGate schemeCode={schemeCode} series={series} loading={<FundSkeleton />}>
        {(ready) => (
          <FundBody
            ready={ready}
            series={series}
            schemeCode={schemeCode}
            name={name}
            onTitleScrolledAway={setTitleScrolledAway}
          />
        )}
      </FundGate>
    </View>
  );
}

interface FundBodyProps {
  ready: FundReady;
  series: ReturnType<typeof useFundSeries>;
  schemeCode: number;
  name: string;
  onTitleScrolledAway: (away: boolean) => void;
}

function FundBody({ ready, series, schemeCode, name, onTitleScrolledAway }: FundBodyProps) {
  const { colors, spacing } = useTheme();
  const { history, points, last } = ready;
  const [chosenRange, setChosenRange] = useState<ChartRange | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [titleBottom, setTitleBottom] = useState(0);

  const range = chosenRange ?? defaultChartRange(points);
  const months = CHART_RANGES.find((item) => item.key === range)?.months ?? null;
  const ranged = useMemo(() => sliceRange(points, months), [points, months]);
  const recent = useMemo(() => navRowsNewestFirst(points).slice(0, RECENT_NAV_COUNT), [points]);
  // Each closed section still states its takeaway.
  const returnsHeadline = useMemo(() => headlineReturn(trailingReturns(points)), [points]);
  const sipPreview = useMemo(
    () => replayInvestment(points, 5000, 60, 'sip') ?? replayInvestment(points, 5000, 12, 'sip'),
    [points],
  );
  const rolling = useMemo(() => rollingReturns(points, 3), [points]);
  const drawdown = useMemo(() => maxDrawdown(points), [points]);
  const insets = useSafeAreaInsets();
  const coverage = useMemo(
    () => new Map(CHART_RANGES.map((item) => [item.key, rangeCovered(points, item.months)])),
    [points],
  );
  const held = usePortfolioStore((s) => s.lots.some((lot) => lot.schemeCode === schemeCode));

  const { history: historyQuery, latest: latestQuery } = series;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([historyQuery.refetch(), latestQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [historyQuery, latestQuery]);

  const onTitleLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setTitleBottom(y + height);
  }, []);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // React skips the re-render when the boolean hasn't changed.
      onTitleScrolledAway(titleBottom > 0 && event.nativeEvent.contentOffset.y > titleBottom);
    },
    [onTitleScrolledAway, titleBottom],
  );

  const first = points[0] ?? last;
  const sipYears = sipPreview === null ? 0 : Math.round(sipPreview.installments / 12);

  return (
    <View style={styles.flex}>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 3 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <View onLayout={onTitleLayout}>
          <FundHero name={name} meta={history.meta} points={points} />
        </View>

        {/* The chart sits on the page, not in a card, with its ranges right under it. */}
        <View style={{ gap: spacing.md }}>
          <NavChart points={ranged} rangeLabel={chartRangeLabel(range, points)} />
          <SegmentedRow
            accessibilityLabel="Chart range"
            options={CHART_RANGES.map((item) => ({
              key: item.key,
              label: item.label,
              disabled: !coverage.get(item.key),
            }))}
            selected={range}
            onSelect={setChosenRange}
          />
        </View>

        <KeyFacts meta={history.meta} last={last} first={first} skipped={history.skipped} />

        <FundLots schemeCode={schemeCode} last={last} />

        <Section
          title="Returns"
          initiallyOpen
          summary={
            returnsHeadline !== null && returnsHeadline.percent !== null ? (
              <AppText variant="label" tone="muted" numeric>
                {formatPercent(returnsHeadline.percent)}{' '}
                {returnsHeadline.key === 'ALL' ? 'a year since start' : `${returnsHeadline.key} annualised`}
              </AppText>
            ) : undefined
          }
        >
          <ReturnsBars points={points} />
          <Button
            label="Compare with another fund"
            variant="secondary"
            icon="git-compare-outline"
            onPress={() => router.push({ pathname: '/compare', params: { a: String(schemeCode), nameA: name } })}
          />
        </Section>

        <Section
          title="If you had invested"
          summary={
            sipPreview !== null ? (
              <AppText variant="label" tone="muted" numeric>
                ₹5,000 a month for {sipYears} {sipYears === 1 ? 'year' : 'years'} →{' '}
                {formatInrCompact(sipPreview.current, VALUE_SCALE)}
              </AppText>
            ) : undefined
          }
        >
          <InvestReplay points={points} />
        </Section>

        {rolling !== null && (
          <Section
            title="How consistent were returns?"
            summary={
              <AppText variant="label" tone="muted" numeric>
                3-year holds: {formatPercent(rolling.worst)} to {formatPercent(rolling.best)} a year
                {drawdown !== null ? ` · worst fall ${formatPercent(drawdown.percent)}` : ''}
              </AppText>
            }
          >
            <Consistency points={points} />
          </Section>
        )}

        <Section
          title="NAV history"
          summary={
            <AppText variant="label" tone="muted" numeric>
              {points.length} NAVs since {formatMonthYear(first.date)}
            </AppText>
          }
        >
          <View style={{ marginHorizontal: -spacing.lg }}>
            {recent.map((row) => (
              <NavRowView key={row.date} row={row} />
            ))}
          </View>
          <Button
            label={`See all ${points.length} NAVs`}
            variant="secondary"
            onPress={() => router.push({ pathname: '/fund/[code]/navs', params: { code: String(schemeCode), name } })}
          />
        </Section>

        <AppText variant="caption" tone="muted">
          Source: mfapi.in (AMFI data). Earliest NAV in the data: {formatDate(first.date)}. NAVs are published after
          market close; funds of funds and overseas funds publish a day later. ISIN{' '}
          {history.meta.isinGrowth ?? history.meta.isinDivReinvestment ?? '—'}.
        </AppText>
      </ScrollView>

      {/* One primary action, always in reach, as investing apps do. */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: Math.max(spacing.md, insets.bottom),
          },
        ]}
      >
        <Button
          label={held ? 'Add another purchase' : 'Add a holding'}
          icon="add"
          onPress={() => router.push({ pathname: '/add-holding', params: { code: String(schemeCode), name } })}
        />
      </View>
    </View>
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
  ranges: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth },
});
