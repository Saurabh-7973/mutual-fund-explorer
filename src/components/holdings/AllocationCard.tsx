import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AssetClass } from '@/domain/assetClass';
import { formatPercentHundredths } from '@/domain/format';
import type { AllocationSlice, AssetClassSlice } from '@/domain/holdings';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

/** Colour follows the class, never its rank, so Equity is the same blue on every screen. */
const CLASS_SLOT: Record<AssetClass, number | null> = {
  Equity: 0,
  Debt: 1,
  Hybrid: 2,
  'Gold & silver': 3,
  Other: null,
};

interface Row {
  key: string;
  label: string;
  detail?: string;
  shareHundredths: bigint;
  /** Index into the chart palette; null for the neutral "Other". */
  slot: number | null;
}

export interface AllocationCardProps {
  byClass: AssetClassSlice[];
  byFund: AllocationSlice[];
}

/**
 * Where the money sits. Part-to-whole is a single stacked bar (easier to compare than a pie),
 * with every slice named and its share printed, so colour is never the only way to tell them
 * apart. Asset class first, because equity against debt is the allocation that matters; the
 * fund split is one tap away.
 */
export function AllocationCard({ byClass, byFund }: AllocationCardProps) {
  const { colors, radius, spacing } = useTheme();
  const [view, setView] = useState<'class' | 'fund'>('class');
  if (byFund.length === 0) return null;

  const rows: Row[] =
    view === 'class'
      ? byClass.map((slice) => ({
          key: slice.assetClass,
          label: slice.assetClass,
          detail: `${slice.fundCount} ${slice.fundCount === 1 ? 'fund' : 'funds'}`,
          shareHundredths: slice.shareHundredths,
          slot: CLASS_SLOT[slice.assetClass],
        }))
      : byFund.map((slice, i) => ({
          key: String(slice.schemeCode ?? 'other'),
          label: slice.label,
          shareHundredths: slice.shareHundredths,
          slot: slice.schemeCode === null ? null : i,
        }));
  const colour = (slot: number | null) => (slot === null ? colors.chartOther : (colors.chart[slot] ?? colors.chartOther));
  const share = (row: Row) => formatPercentHundredths(row.shareHundredths, 'negative-only');

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <AppText variant="label" tone="muted" style={styles.flex}>
          Allocation
        </AppText>
        <View style={[styles.segment, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          {(['class', 'fund'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setView(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === option }}
              hitSlop={8}
              style={[
                styles.segmentItem,
                { borderRadius: radius.pill, backgroundColor: view === option ? colors.surface : 'transparent' },
              ]}
            >
              <AppText variant="caption" tone={view === option ? 'default' : 'muted'} style={styles.segmentText}>
                {option === 'class' ? 'Asset class' : 'Fund'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Allocation by ${view === 'class' ? 'asset class' : 'fund'}: ${rows.map((r) => `${r.label} ${share(r)}`).join(', ')}`}
        style={[styles.bar, { gap: 2 }]}
      >
        {rows.map((row, i) => (
          <View
            key={row.key}
            style={{
              flexGrow: Number(row.shareHundredths),
              flexBasis: 0,
              minWidth: 4,
              backgroundColor: colour(row.slot),
              borderTopLeftRadius: i === 0 ? 4 : 0,
              borderBottomLeftRadius: i === 0 ? 4 : 0,
              borderTopRightRadius: i === rows.length - 1 ? 4 : 0,
              borderBottomRightRadius: i === rows.length - 1 ? 4 : 0,
            }}
          />
        ))}
      </View>

      <View style={{ gap: spacing.sm }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {rows.map((row) => (
          <View key={row.key} style={[styles.legend, { gap: spacing.sm }]}>
            <View style={[styles.swatch, { backgroundColor: colour(row.slot) }]} />
            <AppText variant="label" numberOfLines={1} style={styles.flex}>
              {row.label}
              {row.detail !== undefined && (
                <AppText variant="caption" tone="muted">
                  {`  ${row.detail}`}
                </AppText>
              )}
            </AppText>
            <AppText variant="label" numeric>
              {share(row)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  segment: { flexDirection: 'row', padding: 2 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 4 },
  segmentText: { fontWeight: '600' },
  bar: { flexDirection: 'row', height: 12 },
  legend: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
