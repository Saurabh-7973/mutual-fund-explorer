import { StyleSheet, View } from 'react-native';

import { formatPercentHundredths } from '@/domain/format';
import type { AllocationSlice } from '@/domain/holdings';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

/** One hue at falling strength: funds are ranked by size, not categories that need telling apart. */
const STRENGTH = [1, 0.7, 0.48, 0.3];

/** Where the money sits: a single stacked bar with a labelled legend underneath. */
export function AllocationBar({ slices }: { slices: AllocationSlice[] }) {
  const { colors, radius, spacing } = useTheme();
  if (slices.length < 2) return null;
  const color = (i: number, slice: AllocationSlice) =>
    slice.schemeCode === null ? colors.border : colors.primary;
  const opacity = (i: number, slice: AllocationSlice) => (slice.schemeCode === null ? 1 : (STRENGTH[i] ?? 0.3));
  const share = (slice: AllocationSlice) => formatPercentHundredths(slice.shareHundredths, 'negative-only');

  return (
    <View
      accessible
      accessibilityLabel={`Allocation: ${slices.map((slice) => `${slice.label} ${share(slice)}`).join(', ')}`}
      style={{ gap: spacing.sm }}
    >
      <View style={[styles.bar, { borderRadius: radius.sm, gap: 2 }]}>
        {slices.map((slice, i) => (
          <View
            key={slice.schemeCode ?? 'other'}
            style={{
              flexGrow: Number(slice.shareHundredths),
              flexBasis: 0,
              minWidth: 3,
              backgroundColor: color(i, slice),
              opacity: opacity(i, slice),
            }}
          />
        ))}
      </View>
      {slices.map((slice, i) => (
        <View key={slice.schemeCode ?? 'other'} style={[styles.legend, { gap: spacing.sm }]}>
          <View style={[styles.swatch, { backgroundColor: color(i, slice), opacity: opacity(i, slice) }]} />
          <AppText variant="caption" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
            {slice.label}
          </AppText>
          <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
            {share(slice)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 10, overflow: 'hidden' },
  legend: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  flex: { flex: 1 },
});
