import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatPercent } from '@/domain/format';
import { trailingReturns } from '@/domain/returns';
import type { NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';

/**
 * Trailing returns as a small bar chart: the length makes periods comparable at a glance,
 * the number gives the exact figure, and each row says whether it is absolute or a yearly rate.
 * When any period is negative, bars grow both ways from a shared zero line.
 */
export function ReturnsCard({ points }: { points: NavPoint[] }) {
  const { colors, radius, spacing } = useTheme();
  const rows = useMemo(() => trailingReturns(points), [points]);
  const values = rows.map((row) => row.percent).filter((p): p is number => p !== null);
  const maxAbs = Math.max(1, ...values.map(Math.abs));
  const twoSided = values.some((p) => p < 0);

  return (
    <Card style={{ gap: spacing.md }}>
      <AppText variant="heading" accessibilityRole="header">
        Trailing returns
      </AppText>
      <View style={{ gap: spacing.sm }}>
        {rows.map((row) => {
          const kind = row.kind === 'absolute' ? 'absolute' : 'a year';
          if (row.percent === null) {
            return (
              <View
                key={row.key}
                accessible
                accessibilityLabel={`${row.label}: not enough history`}
                style={[styles.row, { gap: spacing.md }]}
              >
                <AppText variant="label" style={styles.label}>
                  {row.label}
                </AppText>
                <AppText variant="caption" tone="muted" style={styles.flex}>
                  Not enough history
                </AppText>
              </View>
            );
          }
          const p = row.percent;
          const tone = p > 0 ? 'gain' : p < 0 ? 'loss' : 'muted';
          const fill = p > 0 ? colors.gain : p < 0 ? colors.loss : colors.border;
          const width = `${Math.max(2, (Math.abs(p) / maxAbs) * 100)}%` as const;
          const bar = <View style={{ width, height: 8, borderRadius: radius.sm, backgroundColor: fill, opacity: 0.85 }} />;
          return (
            <View
              key={row.key}
              accessible
              accessibilityLabel={`${row.label}: ${p < 0 ? 'down' : p > 0 ? 'up' : 'unchanged'} ${formatPercent(Math.abs(p), 'negative-only')} ${row.kind === 'absolute' ? 'absolute' : 'per year'}`}
              style={[styles.row, { gap: spacing.md }]}
            >
              <AppText variant="label" style={styles.label}>
                {row.label}
              </AppText>
              {twoSided ? (
                <View style={[styles.flex, styles.track]}>
                  <View style={[styles.half, styles.end]}>{p < 0 ? bar : null}</View>
                  <View style={[styles.axis, { backgroundColor: colors.border }]} />
                  <View style={styles.half}>{p >= 0 ? bar : null}</View>
                </View>
              ) : (
                <View style={[styles.flex, styles.track]}>{bar}</View>
              )}
              <View style={styles.value}>
                <AppText variant="label" tone={tone} numeric>
                  {formatPercent(p)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {kind}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" tone="muted">
        Under a year the change is absolute; from a year it is compounded yearly (CAGR). NAV-based, so IDCW payouts
        aren't added back. Past returns don't predict future ones.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  label: { width: 76 },
  flex: { flex: 1 },
  track: { flexDirection: 'row', alignItems: 'center' },
  half: { flex: 1, flexDirection: 'row' },
  end: { justifyContent: 'flex-end' },
  axis: { width: 1, height: 16 },
  value: { width: 72, alignItems: 'flex-end' },
});
