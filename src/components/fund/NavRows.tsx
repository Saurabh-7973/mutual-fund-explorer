import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercentHundredths } from '@/domain/format';
import type { NavRow } from '@/domain/nav';
import type { IsoDate } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

/** One height for every item in the NAV list, so getItemLayout is exact. */
export const NAV_ROW_HEIGHT = 48;

/** Date | NAV | change. Used by the fund screen's recent NAVs and the full list. */
export const NavRowView = memo(function NavRowView({ row }: { row: NavRow }) {
  const { colors, spacing } = useTheme();
  const tone = row.diff === null || row.diff === 0n ? 'muted' : row.diff > 0n ? 'gain' : 'loss';
  const direction = row.diff === null ? '' : row.diff > 0n ? 'up ' : row.diff < 0n ? 'down ' : 'unchanged ';
  return (
    <View
      accessible
      accessibilityLabel={`${formatDate(row.date)}, NAV ${formatNav(row.nav)}${
        row.diff !== null && row.pctHundredths !== null
          ? `, ${direction}${formatPercentHundredths(row.pctHundredths < 0n ? -row.pctHundredths : row.pctHundredths, 'negative-only')}`
          : ''
      }`}
      style={[styles.row, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.sm }]}
    >
      <AppText variant="label" numeric maxFontSizeMultiplier={1.3} style={styles.date}>
        {formatDate(row.date)}
      </AppText>
      <AppText variant="label" numeric maxFontSizeMultiplier={1.3} style={styles.nav}>
        {formatNav(row.nav)}
      </AppText>
      <AppText
        variant="caption"
        tone={tone}
        numeric
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={styles.change}
      >
        {row.diff === null || row.pctHundredths === null
          ? '—'
          : `${formatNavChange(row.diff)} (${formatPercentHundredths(row.pctHundredths)})`}
      </AppText>
    </View>
  );
});

export const GapRowView = memo(function GapRowView({ from, to, days }: { from: IsoDate; to: IsoDate; days: number }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg }]}>
      <AppText variant="caption" tone="muted" numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.gap}>
        No NAV for {days} days ({formatDate(from)} to {formatDate(to)}): holidays or missing data
      </AppText>
    </View>
  );
});

/** Column titles for the NAV list, matching NavRowView's widths. */
export function NavHeaderRow() {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
      <AppText variant="caption" tone="muted" style={styles.date}>
        Date
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.nav}>
        NAV
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.change}>
        Change
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: NAV_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  date: { width: 96 },
  nav: { width: 92, textAlign: 'right' },
  change: { flex: 1, textAlign: 'right' },
  gap: { flex: 1, fontStyle: 'italic' },
});
