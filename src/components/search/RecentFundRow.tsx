import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { formatNav, formatPercentHundredths } from '@/domain/format';
import { describeScheme } from '@/domain/schemeName';
import { useDayChange, useLatestNav } from '@/query/hooks';
import type { RecentFund } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

// Whole device pixels: at 2.625x, 60 dp is a fractional pixel height, so every other row overlapped
// the one above by a pixel and hid its hairline divider.
export const RECENT_ROW_HEIGHT = PixelRatio.roundToNearestPixel(60);

/** A fund opened earlier: name and plan, with its latest NAV and today's move so the list is worth a glance. */
export const RecentFundRow = memo(function RecentFundRow({ fund }: { fund: RecentFund }) {
  const { colors, spacing } = useTheme();
  const label = useMemo(() => describeScheme(fund.schemeName), [fund.schemeName]);
  const latest = useLatestNav(fund.schemeCode);
  const point = latest.data?.point;
  const change = useDayChange(fund.schemeCode, point);
  const meta = [label.plan, label.option].filter((part): part is NonNullable<typeof part> => part !== null).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/fund/[code]', params: { code: String(fund.schemeCode), name: fund.schemeName } })
      }
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, gap: spacing.md, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.flex, { gap: 2 }]}>
        <AppText variant="labelStrong" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {label.title}
        </AppText>
        {meta !== '' && (
          <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
            {meta}
          </AppText>
        )}
      </View>
      {point !== null && point !== undefined && (
        <View style={[styles.right, { gap: 2 }]}>
          <AppText variant="label" numeric maxFontSizeMultiplier={1.3}>
            {formatNav(point.nav)}
          </AppText>
          {change !== null && (
            <AppText
              variant="caption"
              numeric
              maxFontSizeMultiplier={1.3}
              tone={change.diff > 0n ? 'gain' : change.diff < 0n ? 'loss' : 'muted'}
            >
              {formatPercentHundredths(change.pctHundredths)} 1D
            </AppText>
          )}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { height: RECENT_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
});
