import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { CompareChart } from '@/components/fund/CompareChart';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentedRow } from '@/components/ui/SegmentedRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { Term } from '@/components/ui/Term';
import { FundMark } from '@/components/ui/FundMark';
import { comparisonCovers, compareGrowth } from '@/domain/compare';
import { formatDate } from '@/domain/dates';
import { formatPercent } from '@/domain/format';
import { maxDrawdown, rollingReturns } from '@/domain/longTerm';
import { trailingReturns } from '@/domain/returns';
import { describeScheme } from '@/domain/schemeName';
import { MIN_QUERY_LENGTH, parseSchemeCode, rankSearchResults } from '@/domain/search';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOnline } from '@/hooks/useOnline';
import type { NavPoint } from '@/domain/types';
import { useFundSeries, useSchemeSearch } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { MIN_TOUCH, fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const RANGES = [
  { key: '12', label: '1Y', months: 12 },
  { key: '36', label: '3Y', months: 36 },
  { key: '60', label: '5Y', months: 60 },
  { key: 'all', label: 'All', months: null },
] as const;

export default function CompareScreen() {
  const params = useLocalSearchParams<{ a: string; b?: string; nameA?: string }>();
  const a = parseSchemeCode(params.a);
  const b = parseSchemeCode(params.b);
  if (a === null) {
    return (
      <Centered>
        <EmptyState icon="link-outline" title="That link doesn't point to a scheme" />
      </Centered>
    );
  }
  if (b === null) return <ChooseFund a={a} nameA={params.nameA} />;
  return <Comparison a={a} b={b} />;
}

function Centered({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.centered, { backgroundColor: colors.background }]}>{children}</View>;
}

/**
 * Pick the second fund: search any fund, or take one you already hold, watch or looked at
 * (listed first, so the common case is one tap).
 */
function ChooseFund({ a, nameA }: { a: number; nameA: string | undefined }) {
  const { colors, radius, spacing } = useTheme();
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const lots = usePortfolioStore((s) => s.lots);
  const recent = usePreferencesStore((s) => s.recentlyViewed);
  const [text, setText] = useState('');
  const debounced = useDebouncedValue(text, 300);
  const { query, enabled } = useSchemeSearch(debounced);
  const online = useOnline();

  const candidates = useMemo(() => {
    const seen = new Set<number>([a]);
    const list: Choice[] = [];
    const add = (code: number, name: string, why: string) => {
      if (seen.has(code)) return;
      seen.add(code);
      list.push({ schemeCode: code, schemeName: name, why });
    };
    for (const lot of lots) add(lot.schemeCode, lot.schemeName, 'In your holdings');
    for (const item of watchlist) add(item.schemeCode, item.schemeName, 'On your watchlist');
    for (const item of recent) add(item.schemeCode, item.schemeName, 'Recently viewed');
    return list;
  }, [a, lots, watchlist, recent]);

  // keepPreviousData would show old results for a new query that is paused offline.
  const stalePaused = query.isPlaceholderData && query.fetchStatus === 'paused';
  const results = useMemo<Choice[]>(
    () =>
      !enabled || query.data === undefined || stalePaused
        ? []
        : rankSearchResults(query.data)
            .filter((item) => item.schemeCode !== a)
            .map((item) => ({ schemeCode: item.schemeCode, schemeName: item.schemeName, why: null })),
    [enabled, query.data, stalePaused, a],
  );

  const searching = text.trim().length > 0;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <AppText variant="heading" accessibilityRole="header">
        Compare {nameA !== undefined ? describeScheme(nameA).title : 'this fund'} with
      </AppText>
      <View style={[styles.search, { backgroundColor: colors.surface, borderRadius: radius.field, paddingLeft: spacing.lg, gap: spacing.sm }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search any fund"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search a fund to compare with"
          style={[styles.searchInput, { color: colors.text, fontFamily: fonts.regular, fontSize: 15 }]}
        />
      </View>

      {searching ? (
        !enabled ? (
          <AppText variant="label" tone="muted">
            Type at least {MIN_QUERY_LENGTH} characters. Search matches whole words.
          </AppText>
        ) : query.isError || stalePaused || (!online && query.data === undefined) ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data === undefined || query.isPlaceholderData ? (
          <AppText variant="label" tone="muted">
            Searching…
          </AppText>
        ) : results.length === 0 ? (
          <AppText variant="label" tone="muted">
            No funds match "{text.trim()}". Try a whole word, such as a fund house's name.
          </AppText>
        ) : (
          <ChoiceList choices={results} />
        )
      ) : candidates.length > 0 ? (
        <>
          <AppText variant="label" tone="muted">
            Yours
          </AppText>
          <ChoiceList choices={candidates} />
        </>
      ) : (
        <AppText variant="label" tone="muted">
          Search above, or star or open another fund and it will be listed here.
        </AppText>
      )}
    </ScrollView>
  );
}

interface Choice {
  schemeCode: number;
  schemeName: string;
  /** Why it's suggested ("In your holdings"); null for a search result. */
  why: string | null;
}

/** Funds to pick from, in one white card. */
function ChoiceList({ choices }: { choices: Choice[] }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg }}>
      {choices.map((fund, i) => {
        const label = describeScheme(fund.schemeName);
        return (
          <Pressable
            key={fund.schemeCode}
            accessibilityRole="button"
            onPress={() => router.setParams({ b: String(fund.schemeCode) })}
            style={({ pressed }) => [
              styles.choice,
              {
                borderBottomColor: colors.hairline,
                borderBottomWidth: i === choices.length - 1 ? 0 : StyleSheet.hairlineWidth,
                gap: spacing.md,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <FundMark schemeName={fund.schemeName} size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="rowTitle" numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {label.title}
              </AppText>
              <AppText variant="label" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {[label.plan, label.option, fund.why].filter((part): part is string => part !== null).join(' · ')}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

interface FundFacts {
  title: string;
  name: string;
  returns: ReturnType<typeof trailingReturns>;
  drawdown: ReturnType<typeof maxDrawdown>;
  rolling: ReturnType<typeof rollingReturns>;
  since: NavPoint | undefined;
}

function facts(name: string, points: NavPoint[]): FundFacts {
  return {
    title: describeScheme(name).title,
    name,
    returns: trailingReturns(points),
    drawdown: maxDrawdown(points),
    rolling: rollingReturns(points, 3),
    since: points[0],
  };
}

/** Two funds side by side: one growth chart, then the same figures in two columns. */
function Comparison({ a, b }: { a: number; b: number }) {
  const { colors, radius, spacing } = useTheme();
  const seriesA = useFundSeries(a);
  const seriesB = useFundSeries(b);
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key'] | null>(null);
  const pointsA = seriesA.points;
  const pointsB = seriesB.points;
  const nameA = seriesA.history.data?.meta.schemeName ?? `Scheme ${a}`;
  const nameB = seriesB.history.data?.meta.schemeName ?? `Scheme ${b}`;

  const covered = useMemo(
    () => (pointsA && pointsB ? RANGES.filter((r) => comparisonCovers(pointsA, pointsB, r.months)) : []),
    [pointsA, pointsB],
  );
  const range =
    RANGES.find((r) => r.key === rangeKey) ?? covered.find((r) => r.key === '36') ?? covered[covered.length - 1];
  const growth = useMemo(
    () => (pointsA && pointsB && range ? compareGrowth(pointsA, pointsB, range.months) : null),
    [pointsA, pointsB, range],
  );
  const fa = useMemo(() => (pointsA ? facts(nameA, pointsA) : null), [pointsA, nameA]);
  const fb = useMemo(() => (pointsB ? facts(nameB, pointsB) : null), [pointsB, nameB]);

  const failed = seriesA.history.isError ? seriesA.history : seriesB.history.isError ? seriesB.history : null;
  if (failed !== null) {
    return (
      <Centered>
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      </Centered>
    );
  }
  if (!fa || !fb || !pointsA || !pointsB) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md }}>
        <Skeleton height={20} width="60%" />
        <Skeleton height={180} />
        <Skeleton height={240} />
      </View>
    );
  }

  const ret = (f: FundFacts, key: string) => f.returns.find((r) => r.key === key)?.percent ?? null;
  const rows: { label: string; term?: Parameters<typeof Term>[0]['term']; a: number | null; b: number | null; kind: 'pct' | 'share' }[] = [
    { label: '1 year', a: ret(fa, '1Y'), b: ret(fb, '1Y'), kind: 'pct' },
    { label: '3 years (p.a.)', term: 'cagr', a: ret(fa, '3Y'), b: ret(fb, '3Y'), kind: 'pct' },
    { label: '5 years (p.a.)', a: ret(fa, '5Y'), b: ret(fb, '5Y'), kind: 'pct' },
    { label: 'Typical 3-year hold (p.a.)', term: 'rolling', a: fa.rolling?.median ?? null, b: fb.rolling?.median ?? null, kind: 'pct' },
    {
      label: '3-year holds that lost money',
      a: fa.rolling ? fa.rolling.lossShare * 100 : null,
      b: fb.rolling ? fb.rolling.lossShare * 100 : null,
      kind: 'share',
    },
    { label: 'Worst fall', term: 'drawdown', a: fa.drawdown?.percent ?? null, b: fb.drawdown?.percent ?? null, kind: 'pct' },
  ];
  const show = (v: number | null, kind: 'pct' | 'share') =>
    v === null ? '—' : kind === 'share' ? `${Math.round(v)}%` : formatPercent(v);
  const tone = (v: number | null, kind: 'pct' | 'share') =>
    v === null || kind === 'share' ? ('default' as const) : v > 0 ? ('gain' as const) : v < 0 ? ('loss' as const) : ('muted' as const);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card style={{ gap: spacing.md }}>
        <AppText variant="heading" accessibilityRole="header">
          Growth of ₹10,000
        </AppText>
        <SegmentedRow
          accessibilityLabel="Period"
          options={RANGES.map((r) => ({ key: r.key, label: r.label, disabled: !covered.includes(r) }))}
          selected={range?.key ?? 'all'}
          onSelect={setRangeKey}
        />
        {growth !== null && <CompareChart growth={growth} labelA={fa.title} labelB={fb.title} />}
        <AppText variant="caption" tone="muted">
          Both start at ₹10,000 on the same day. Drag to read any date.
        </AppText>
      </Card>

      <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: spacing.sm }}>
        <View style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm }]}>
          <View style={styles.labelCol} />
          {[fa, fb].map((f, i) => (
            <View key={i} style={[styles.valueCol, { gap: 4 }]}>
              <View style={[styles.markRow, { gap: 6 }]}>
                <View style={[styles.swatch, { backgroundColor: colors.chart[i] }]} />
                <FundMark schemeName={f.name} size={28} />
              </View>
              <AppText variant="caption" numberOfLines={2} style={styles.right}>
                {f.title}
              </AppText>
            </View>
          ))}
        </View>
        {rows.map((row) => (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}: ${fa.title} ${show(row.a, row.kind)}, ${fb.title} ${show(row.b, row.kind)}`}
            style={[
              styles.row,
              { borderTopColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.sm, minHeight: MIN_TOUCH },
              styles.divider,
            ]}
          >
            <View style={styles.labelCol}>
              {row.term ? <Term term={row.term} label={row.label} /> : <AppText variant="label" tone="muted">{row.label}</AppText>}
            </View>
            <AppText variant="labelStrong" numeric tone={tone(row.a, row.kind)} style={[styles.valueCol, styles.right]}>
              {show(row.a, row.kind)}
            </AppText>
            <AppText variant="labelStrong" numeric tone={tone(row.b, row.kind)} style={[styles.valueCol, styles.right]}>
              {show(row.b, row.kind)}
            </AppText>
          </View>
        ))}
        <View style={[styles.row, styles.divider, { borderTopColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.sm, minHeight: MIN_TOUCH }]}>
          <AppText variant="label" tone="muted" style={styles.labelCol}>
            NAV data since
          </AppText>
          <AppText variant="label" numeric style={[styles.valueCol, styles.right]}>
            {fa.since ? formatDate(fa.since.date) : '—'}
          </AppText>
          <AppText variant="label" numeric style={[styles.valueCol, styles.right]}>
            {fb.since ? formatDate(fb.since.date) : '—'}
          </AppText>
        </View>
      </Card>

      <Pressable
        onPress={() => router.setParams({ b: '' })}
        accessibilityRole="button"
        style={[styles.change, { borderRadius: radius.md }]}
      >
        <AppText variant="labelStrong" tone="primary">
          Compare with a different fund
        </AppText>
      </Pressable>
      <AppText variant="caption" tone="muted">
        From published NAVs, before costs and taxes. Past performance may or may not be sustained in future.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
  choice: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  searchInput: { flex: 1, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  labelCol: { flex: 1.3 },
  valueCol: { flex: 1, alignItems: 'flex-end' },
  right: { textAlign: 'right' },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  markRow: { flexDirection: 'row', alignItems: 'center' },
  change: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
