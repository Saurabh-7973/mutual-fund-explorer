import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from '../../ui/AppText';

/** One figure in the strip under "Your investment" (side by side, or a label/value row at large text). */
export function Cell({ label, stacked, children }: { label: string; stacked: boolean; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View
      style={
        stacked
          ? [styles.cellStacked, { paddingVertical: spacing.xs, gap: spacing.md }]
          : [styles.cell, { paddingVertical: spacing.md, gap: 2 }]
      }
    >
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.hairline }]} />;
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center' },
  cellStacked: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' },
  divider: { width: StyleSheet.hairlineWidth, marginVertical: 10 },
});
