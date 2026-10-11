import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav, formatPercentHundredths } from '@/domain/format';
import { isStale } from '@/domain/nav';
import { describeScheme, optionFromIsins } from '@/domain/schemeName';
import { useDayChange, useLatestNav } from '@/query/hooks';
import type { IsoDate } from '@/domain/types';
import type { RecentFund } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { FundMark } from '../ui/FundMark';

// Whole device pixels: at 2.625x, 60 dp is a fractional pixel height, so every other row overlapped
// the one above by a pixel and hid its hairline divider.
export const RECENT_ROW_HEIGHT = PixelRatio.roundToNearestPixel(60);

/**
 * A fund opened earlier: name and plan, with its latest NAV and today's move so the list is worth a glance.
 * The section header carries the shared NAV date (`asOf`); a NAV from another day says its own date, and
 * a stale one (a closed scheme) says "Stale" with its date instead of an old day's move.
 */
export const RecentFundRow = memo(function RecentFundRow({ fund, asOf }: { fund: RecentFund; asOf: IsoDate | null }) {
  const { colors, spacing } = useTheme();
  const label = useMemo(() => describeScheme(fund.schemeName), [fund.schemeName]);
  const latest = useLatestNav(fund.schemeCode);
  const point = latest.data?.point;
  const change = useDayChange(fund.schemeCode, point);
  const option =
    label.option ??
    (latest.data !== undefined ? optionFromIsins(latest.data.meta.isinGrowth, latest.data.meta.isinDivReinvestment) : null);
  const stale = point !== null && point !== undefined && isStale(point.date, todayInIndia());
  const otherDay = point !== null && point !== undefined && !stale && point.date !== asOf;
  const meta = [label.plan, option].filter((part): part is NonNullable<typeof part> => part !== null).join(' · ');

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
      <FundMark schemeName={fund.schemeName} size={36} />
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
          {stale ? (
            <View style={[styles.line, { gap: spacing.xs }]}>
              <Badge label="Stale" tone="warning" />
              <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
                {formatDate(point.date)}
              </AppText>
            </View>
          ) : (
            change !== null && (
              <AppText
                variant="caption"
                numeric
                maxFontSizeMultiplier={1.3}
                tone={change.diff > 0n ? 'gain' : change.diff < 0n ? 'loss' : 'muted'}
              >
                {formatPercentHundredths(change.pctHundredths)}
                {otherDay ? (
                  <AppText variant="caption" tone="muted" numeric>
                    {` · ${formatDate(point.date)}`}
                  </AppText>
                ) : null}
              </AppText>
            )
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
  line: { flexDirection: 'row', alignItems: 'center' },
});
