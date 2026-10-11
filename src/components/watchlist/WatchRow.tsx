import { router } from 'expo-router';
import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercentHundredths } from '@/domain/format';
import { isStale } from '@/domain/nav';
import { describeScheme } from '@/domain/schemeName';
import { useDayChange, useLatestNav } from '@/query/hooks';
import type { WatchItem } from '@/store/portfolioSchema';
import { useTheme } from '@/theme/useTheme';

import { SchemeBadges } from '../search/SchemeBadges';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { SwipeRow } from '../ui/SwipeRow';

// Whole device pixels: at 2.625x, 92 dp is a fractional pixel height, so every other row overlapped
// the one above by a pixel and hid its hairline divider.
export const WATCH_ROW_HEIGHT = PixelRatio.roundToNearestPixel(92);

export interface WatchRowProps {
  item: WatchItem;
  onRemove: (schemeCode: number) => void;
}

/**
 * One watched fund: latest NAV with its date and the day's change. Each row runs its
 * own queries, so one failing scheme never blocks the others, and the height never
 * changes between states. Swipe left to remove.
 */
export const WatchRow = memo(function WatchRow({ item, onRemove }: WatchRowProps) {
  const { colors, spacing } = useTheme();
  const { schemeCode, schemeName } = item;
  const title = useMemo(() => describeScheme(schemeName).title, [schemeName]);
  const latest = useLatestNav(schemeCode);
  const point = latest.data?.point;
  const change = useDayChange(schemeCode, point);
  const fundHouse = latest.data?.meta.fundHouse ?? null;
  const remove = useCallback(() => {
    onRemove(schemeCode);
    return true;
  }, [onRemove, schemeCode]);

  // Three lines, each split left | right, so every row lines up:
  // title | NAV, badges | day's change, fund house | as-of date.
  let nav: ReactNode = null;
  let middle: ReactNode = null;
  let date: ReactNode = null;
  if (latest.data === undefined && latest.isLoading) {
    nav = <Skeleton width={84} height={18} />;
    middle = <Skeleton width={96} height={12} />;
    date = <Skeleton width={88} height={12} />;
  } else if (latest.data === undefined) {
    // Failed, or paused offline with nothing saved.
    nav = (
      <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
        Couldn't load NAV
      </AppText>
    );
    middle = (
      <Pressable
        onPress={() => void latest.refetch()}
        accessibilityRole="button"
        accessibilityLabel={`Retry loading the NAV for ${title}`}
        hitSlop={12}
      >
        <AppText variant="label" tone="primary" maxFontSizeMultiplier={1.3}>
          Retry
        </AppText>
      </Pressable>
    );
  } else if (point === null || point === undefined) {
    nav = (
      <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
        No NAV published
      </AppText>
    );
  } else {
    const stale = isStale(point.date, todayInIndia());
    nav = (
      <AppText variant="heading" numeric maxFontSizeMultiplier={1.3}>
        {formatNav(point.nav)}
      </AppText>
    );
    if (change !== null) {
      const direction = change.diff > 0n ? 'up' : change.diff < 0n ? 'down' : 'unchanged';
      const pct = change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths;
      middle = (
        <AppText
          variant="label"
          numeric
          maxFontSizeMultiplier={1.3}
          tone={direction === 'up' ? 'gain' : direction === 'down' ? 'loss' : 'muted'}
          accessibilityLabel={
            direction === 'unchanged'
              ? `unchanged since ${formatDate(change.from.date)}`
              : `${direction} ${formatPercentHundredths(pct, 'negative-only')} since ${formatDate(change.from.date)}`
          }
        >
          {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)})
        </AppText>
      );
    }
    date = (
      <View style={[styles.line, { gap: spacing.xs }]}>
        <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
          as of {formatDate(point.date)}
        </AppText>
        {stale && <Badge label="Stale" tone="warning" />}
      </View>
    );
  }

  return (
    <SwipeRow actionLabel="Remove" onAction={remove}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund. Swipe left to remove."
        onPress={() =>
          router.push({ pathname: '/fund/[code]', params: { code: String(schemeCode), name: schemeName } })
        }
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
            gap: spacing.xs,
            backgroundColor: pressed ? colors.surfaceMuted : colors.background,
          },
        ]}
      >
        <View style={[styles.line, { gap: spacing.md }]}>
          <AppText variant="labelStrong" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
            {title}
          </AppText>
          {nav}
        </View>
        <View style={[styles.line, styles.minLine, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <SchemeBadges name={schemeName} size="sm" />
          </View>
          {middle}
        </View>
        <View style={[styles.line, styles.minLine, { gap: spacing.md }]}>
          <AppText variant="caption" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
            {fundHouse ?? ''}
          </AppText>
          {date}
        </View>
      </Pressable>
    </SwipeRow>
  );
});

const styles = StyleSheet.create({
  row: {
    height: WATCH_ROW_HEIGHT,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  line: { flexDirection: 'row', alignItems: 'center' },
  // Keeps each line's height when a fund has no badges, change or fund house.
  minLine: { minHeight: 20 },
  flex: { flex: 1 },
});
