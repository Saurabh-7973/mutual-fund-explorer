import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatPercent } from '@/domain/format';
import { trailingReturns } from '@/domain/returns';
import type { NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function ReturnsCard({ points }: { points: NavPoint[] }) {
  const { colors, spacing } = useTheme();
  const rows = useMemo(() => trailingReturns(points), [points]);

  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header">
        Trailing returns (NAV based)
      </AppText>
      {rows.map((row) => {
        const kind = row.kind === 'absolute' ? 'absolute' : 'p.a.';
        if (row.percent === null) {
          return (
            <View
              key={row.key}
              accessible
              accessibilityLabel={`${row.label}: not enough history`}
              style={[styles.row, { borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm }]}
            >
              <AppText style={styles.label}>{row.label}</AppText>
              <AppText tone="muted">—</AppText>
              <AppText variant="caption" tone="muted">
                not enough history
              </AppText>
            </View>
          );
        }
        const tone = row.percent > 0 ? 'gain' : row.percent < 0 ? 'loss' : 'muted';
        const text = formatPercent(row.percent);
        const spoken = `${row.label}: ${row.percent < 0 ? 'down' : row.percent > 0 ? 'up' : 'unchanged'} ${formatPercent(Math.abs(row.percent), 'negative-only')} ${row.kind === 'absolute' ? 'absolute' : 'per year'}`;
        return (
          <View
            key={row.key}
            accessible
            accessibilityLabel={spoken}
            style={[styles.row, { borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm }]}
          >
            <AppText style={styles.label}>{row.label}</AppText>
            <AppText tone={tone} numeric>
              {text}
            </AppText>
            <Badge label={kind} />
          </View>
        );
      })}
      <AppText variant="caption" tone="muted">
        Under 1 year: absolute change. 1 year and longer: compound annual growth (CAGR). Based on NAV only; IDCW
        payouts are not added back. Past returns don't predict future returns.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  label: { flex: 1 },
});
