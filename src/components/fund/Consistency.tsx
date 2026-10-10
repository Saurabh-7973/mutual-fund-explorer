import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatMonthYear } from '@/domain/dates';
import { formatPercent, groupIndian } from '@/domain/format';
import { rollingReturns } from '@/domain/longTerm';
import type { NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { SegmentedRow } from '../ui/SegmentedRow';

const HOLDS = [3, 5] as const;

/**
 * Rolling returns, read as a long-term investor would: "had I bought on any day and held
 * for N years, what did I get?". A range from worst to best with the typical result marked
 * says more about a fund than any single trailing number, which depends on today's date.
 */
export function Consistency({ points }: { points: NavPoint[] }) {
  const { colors, radius, spacing } = useTheme();
  const summaries = useMemo(() => HOLDS.map((years) => rollingReturns(points, years)), [points]);
  const available = HOLDS.filter((_, i) => summaries[i] !== null);
  const [years, setYears] = useState<number | null>(null);
  const chosenYears = years ?? available[0] ?? null;
  const summary = summaries[HOLDS.findIndex((y) => y === chosenYears)] ?? null;
  if (summary === null || chosenYears === null) return null;

  // Place worst, typical and best on one track that always includes zero.
  const low = Math.min(0, summary.worst);
  const high = Math.max(0, summary.best);
  const span = high - low || 1;
  const at = (value: number) => `${((value - low) / span) * 100}%` as const;
  const lossPct = Math.round(summary.lossShare * 100);

  return (
    <>
      <SegmentedRow
        accessibilityLabel="Holding period"
        options={HOLDS.map((y) => ({ key: String(y), label: `Held ${y} years`, disabled: !available.includes(y) }))}
        selected={String(chosenYears)}
        onSelect={(key) => setYears(Number(key))}
      />
      <AppText>
        Buying on any day since {formatMonthYear(points[0]?.date ?? summary.from)} and holding for {chosenYears} years
        returned:
      </AppText>

      <View
        accessible
        accessibilityLabel={`Worst ${formatPercent(summary.worst)}, typical ${formatPercent(summary.median)}, best ${formatPercent(summary.best)} a year`}
        style={{ gap: spacing.xs }}
      >
        <View style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          <View
            style={[
              styles.range,
              {
                left: at(summary.worst),
                right: `${100 - ((summary.best - low) / span) * 100}%`,
                backgroundColor: colors.primary,
                borderRadius: radius.pill,
                opacity: 0.35,
              },
            ]}
          />
          <View style={[styles.zero, { left: at(0), backgroundColor: colors.textMuted }]} />
          <View style={[styles.median, { left: at(summary.median), backgroundColor: colors.primary, borderColor: colors.surface }]} />
        </View>
        <View style={styles.legend}>
          <Figure label="Worst" value={summary.worst} align="flex-start" />
          <Figure label="Typical" value={summary.median} align="center" />
          <Figure label="Best" value={summary.best} align="flex-end" />
        </View>
      </View>

      <AppText tone={lossPct > 0 ? 'default' : 'muted'}>
        {lossPct === 0
          ? `No ${chosenYears}-year holding period lost money.`
          : `${lossPct}% of ${chosenYears}-year holding periods ended below where they started.`}
      </AppText>
      <AppText variant="caption" tone="muted">
        Yearly (CAGR) returns over {groupIndian(String(summary.windows))} holding periods ending between{' '}
        {formatMonthYear(summary.from)} and {formatMonthYear(summary.through)}, from NAVs only. Past returns don't predict
        future ones.
      </AppText>
    </>
  );
}

function Figure({ label, value, align }: { label: string; value: number; align: 'flex-start' | 'center' | 'flex-end' }) {
  return (
    <View style={[styles.figure, { alignItems: align }]}>
      <AppText variant="label" numeric tone={value > 0 ? 'gain' : value < 0 ? 'loss' : 'muted'}>
        {formatPercent(value)}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  track: { height: 14, justifyContent: 'center' },
  range: { position: 'absolute', top: 0, bottom: 0 },
  zero: { position: 'absolute', width: 1, top: -3, bottom: -3 },
  median: { position: 'absolute', width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2 },
  legend: { flexDirection: 'row' },
  figure: { flex: 1 },
});
