import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { AssetClass } from '@/domain/assetClass';
import { formatPercentHundredths } from '@/domain/format';
import type { AllocationSlice, AssetClassSlice } from '@/domain/holdings';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { SegmentedRow } from '../ui/SegmentedRow';
import { Term } from '../ui/Term';

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
  const { colors, spacing } = useTheme();
  // The switch needs the full width at large text sizes, so it moves under the label.
  const stacked = useWindowDimensions().fontScale > 1.3;
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
      <View style={stacked ? styles.headerStacked : styles.header}>
        <View style={stacked ? undefined : styles.flex}>
          <Term term="assetClass" label="Allocation" variant="heading" tone="default" />
        </View>
        <View style={stacked ? undefined : styles.switch}>
          <SegmentedRow
            variant="track"
            accessibilityLabel="Allocation by"
            options={[
              { key: 'class', label: 'Asset class' },
              { key: 'fund', label: 'Fund' },
            ]}
            selected={view}
            onSelect={setView}
          />
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
              borderTopLeftRadius: i === 0 ? 5 : 0,
              borderBottomLeftRadius: i === 0 ? 5 : 0,
              borderTopRightRadius: i === rows.length - 1 ? 5 : 0,
              borderBottomRightRadius: i === rows.length - 1 ? 5 : 0,
            }}
          />
        ))}
      </View>

      <View style={{ gap: spacing.sm }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {rows.map((row) => (
          <View key={row.key} style={[styles.legend, { gap: spacing.sm }]}>
            <View style={[styles.swatch, { backgroundColor: colour(row.slot) }]} />
            <AppText variant="label" maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.flex}>
              {row.label}
              {row.detail !== undefined && (
                <AppText variant="caption" maxFontSizeMultiplier={1.3} tone="muted">
                  {`  ${row.detail}`}
                </AppText>
              )}
            </AppText>
            <AppText variant="label" maxFontSizeMultiplier={1.3} numeric style={styles.share}>
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
  headerStacked: { gap: 8 },
  flex: { flex: 1 },
  switch: { width: 196 },
  bar: { flexDirection: 'row', height: 10 },
  legend: { flexDirection: 'row', alignItems: 'center' },
  // Right-aligned in a fixed column, so shares line up at every text size.
  share: { minWidth: 72, textAlign: 'right' },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
