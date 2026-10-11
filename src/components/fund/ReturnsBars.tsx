import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatPercent } from '@/domain/format';
import { trailingReturns, type PeriodReturn } from '@/domain/returns';
import type { NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Term } from '../ui/Term';

/**
 * Trailing returns as a small bar chart, in two groups: periods under a year (absolute
 * change) and periods from a year (annualised). Saying it once per group, with the
 * glossary term as the group's heading, keeps each row to one line. The zero line sits
 * where the data puts it, so a mostly positive fund doesn't waste half the width on
 * losses it never had.
 */
export function ReturnsBars({ points }: { points: NavPoint[] }) {
  const { spacing } = useTheme();
  const rows = useMemo(() => trailingReturns(points), [points]);
  const values = rows.map((row) => row.percent).filter((p): p is number => p !== null);
  const scale = {
    neg: Math.max(0, ...values.map((p) => -p)),
    pos: Math.max(0, ...values),
  };
  if (scale.neg === 0 && scale.pos === 0) scale.pos = 1;
  const short = rows.filter((row) => row.kind === 'absolute');
  const long = rows.filter((row) => row.kind !== 'absolute');

  return (
    <View style={{ gap: spacing.md }}>
      {short.length > 0 && <Group term="absolute" label="Absolute" rows={short} scale={scale} />}
      {long.length > 0 && <Group term="cagr" label="Annualised (CAGR)" rows={long} scale={scale} />}
      <AppText variant="caption" maxFontSizeMultiplier={1.3} tone="muted">
        NAV-based, so IDCW payouts aren't added back. Past performance may or may not be sustained in future.
      </AppText>
    </View>
  );
}

interface Scale {
  neg: number;
  pos: number;
}

function Group({
  term,
  label,
  rows,
  scale,
}: {
  term: 'absolute' | 'cagr';
  label: string;
  rows: PeriodReturn[];
  scale: Scale;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Term term={term} label={label} variant="caption" />
      {rows.map((row) => (
        <ReturnRow key={row.key} row={row} scale={scale} />
      ))}
    </View>
  );
}

function ReturnRow({ row, scale }: { row: PeriodReturn; scale: Scale }) {
  const { colors, radius, spacing } = useTheme();
  if (row.percent === null) {
    return (
      <View
        accessible
        accessibilityLabel={`${row.label}: not enough history`}
        style={[styles.row, { gap: spacing.md }]}
      >
        <AppText variant="label" maxFontSizeMultiplier={1.3} style={styles.label}>
          {row.label}
        </AppText>
        <AppText variant="caption" maxFontSizeMultiplier={1.3} tone="muted" style={styles.flex}>
          Not enough history
        </AppText>
      </View>
    );
  }
  const p = row.percent;
  const tone = p > 0 ? 'gain' : p < 0 ? 'loss' : 'muted';
  const fill = p > 0 ? colors.gain : p < 0 ? colors.loss : colors.border;
  const side = p < 0 ? scale.neg : scale.pos;
  const width = `${side > 0 ? Math.max(3, (Math.abs(p) / side) * 100) : 0}%` as const;
  const bar = <View style={{ width, height: 8, borderRadius: radius.sm, backgroundColor: fill, opacity: 0.85 }} />;
  return (
    <View
      accessible
      accessibilityLabel={`${row.label}: ${p < 0 ? 'down' : p > 0 ? 'up' : 'unchanged'} ${formatPercent(Math.abs(p), 'negative-only')} ${row.kind === 'absolute' ? 'absolute' : 'per year'}`}
      style={[styles.row, { gap: spacing.md }]}
    >
      <AppText variant="label" maxFontSizeMultiplier={1.3} style={styles.label}>
        {row.label}
      </AppText>
      <View style={[styles.flex, styles.track]}>
        {scale.neg > 0 && <View style={[styles.side, styles.end, { flex: scale.neg }]}>{p < 0 ? bar : null}</View>}
        {scale.neg > 0 && <View style={[styles.axis, { backgroundColor: colors.border }]} />}
        {scale.pos > 0 && <View style={[styles.side, { flex: scale.pos }]}>{p >= 0 ? bar : null}</View>}
      </View>
      <AppText variant="label" maxFontSizeMultiplier={1.3} tone={tone} numeric style={styles.value}>
        {formatPercent(p)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  label: { width: 84 },
  flex: { flex: 1 },
  track: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  side: { flexDirection: 'row', alignItems: 'center' },
  end: { justifyContent: 'flex-end' },
  axis: { width: 1, height: 16 },
  value: { width: 72, textAlign: 'right' },
});
