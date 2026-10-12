import { router } from 'expo-router';
import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercent, formatPercentHundredths } from '@/domain/format';
import { isStale, mergeLatest } from '@/domain/nav';
import { trailingReturns } from '@/domain/returns';
import { describeScheme, optionFromIsins } from '@/domain/schemeName';
import type { IsoDate } from '@/domain/types';
import { useQuery } from '@tanstack/react-query';

import { navHistoryQuery, useDayChange, useLatestNav } from '@/query/hooks';
import type { WatchItem } from '@/store/portfolioSchema';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { StatusChip } from '../ui/ChangeChip';
import { Skeleton } from '../ui/Skeleton';
import { SwipeRow } from '../ui/SwipeRow';
import { FUND_MARK_SIZE, FundMark } from '../ui/FundMark';

// Whole device pixels: at 2.625x a fractional dp height made alternate rows overlap by a pixel.
export const WATCH_ROW_HEIGHT = PixelRatio.roundToNearestPixel(72);

export type WatchPeriod = '1D' | '1Y' | '3Y';

export interface WatchRowProps {
  item: WatchItem;
  onRemove: (schemeCode: number) => void;
  /** The date most watched NAVs share (shown in the list header); a row prints its own only when it differs. */
  asOf: IsoDate | null;
  /** Which figure the right side shows: today's change, or the 1- or 3-year return. */
  period: WatchPeriod;
  /** Where the row sits in the card that holds the list. */
  first?: boolean;
  last?: boolean;
}

/**
 * One watched fund, in the same two-line shape as Explore's rows: name | NAV, then plan and
 * option | the day's change in rupees and percent. A week without a NAV shows "Stale" with
 * its date instead of an old move. Each row runs its own queries, so one failing scheme never
 * blocks the others, and the height never changes between states. Swipe left to remove.
 */
export const WatchRow = memo(function WatchRow({ item, onRemove, asOf, period, first = false, last = false }: WatchRowProps) {
  const { colors, radius, spacing } = useTheme();
  const { schemeCode, schemeName } = item;
  const label = useMemo(() => describeScheme(schemeName), [schemeName]);
  const title = label.title;
  const latest = useLatestNav(schemeCode);
  const point = latest.data?.point;
  const change = useDayChange(schemeCode, point);
  // The full history is fetched only when a longer period is chosen (memory-only cache).
  const history = useQuery({ ...navHistoryQuery(schemeCode), enabled: period !== '1D' });
  const longReturn = useMemo(() => {
    if (period === '1D' || history.data === undefined) return null;
    const rows = trailingReturns(mergeLatest(history.data.points, point ?? null));
    return rows.find((row) => row.key === period) ?? null;
  }, [period, history.data, point]);
  const option =
    label.option ??
    (latest.data !== undefined ? optionFromIsins(latest.data.meta.isinGrowth, latest.data.meta.isinDivReinvestment) : null);
  const meta = [label.plan, option].filter((part): part is NonNullable<typeof part> => part !== null).join(' · ');
  const remove = useCallback(() => {
    onRemove(schemeCode);
    return true;
  }, [onRemove, schemeCode]);

  let nav: ReactNode = null;
  let status: ReactNode = null;
  if (latest.data === undefined && latest.isLoading) {
    nav = <Skeleton width={84} height={18} />;
    status = <Skeleton width={96} height={12} />;
  } else if (latest.data === undefined) {
    // Failed, or paused offline with nothing saved.
    nav = (
      <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
        Couldn't load NAV
      </AppText>
    );
    status = (
      <Pressable
        onPress={() => void latest.refetch()}
        accessibilityRole="button"
        accessibilityLabel={`Retry loading the NAV for ${title}`}
        hitSlop={12}
      >
        <AppText variant="labelStrong" tone="primary" maxFontSizeMultiplier={1.3}>
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
      <AppText variant="rowTitle" numeric maxFontSizeMultiplier={1.3}>
        {formatNav(point.nav)}
      </AppText>
    );
    if (stale) {
      // A week or more without a NAV: its date, flagged, instead of an old day's change.
      status = <StatusChip label={`Stale · ${formatDate(point.date)}`} />;
    } else if (period !== '1D') {
      if (history.isLoading) {
        status = <Skeleton width={72} height={12} />;
      } else if (longReturn === null || longReturn.percent === null) {
        // A fund younger than the period, or a history that failed to load.
        status = (
          <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
            {history.isError ? 'Couldn\'t load' : `Under ${period === '1Y' ? 'a year' : '3 years'} old`}
          </AppText>
        );
      } else {
        const p = longReturn.percent;
        const annual = longReturn.kind !== 'absolute';
        status = (
          <AppText
            variant="labelStrong"
            numeric
            maxFontSizeMultiplier={1.3}
            tone={p > 0 ? 'gain' : p < 0 ? 'loss' : 'muted'}
            accessibilityLabel={`${p > 0 ? 'up' : p < 0 ? 'down' : 'unchanged'} ${formatPercent(Math.abs(p), 'negative-only')}${annual ? ' per year' : ''} over ${longReturn.label}`}
          >
            {formatPercent(p)}
            {annual ? (
              <AppText variant="label" tone="muted">
                {' p.a.'}
              </AppText>
            ) : null}
          </AppText>
        );
      }
    } else if (change !== null) {
      const direction = change.diff > 0n ? 'up' : change.diff < 0n ? 'down' : 'unchanged';
      const pct = change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths;
      const otherDay = point.date !== asOf;
      status = (
        <AppText
          variant="labelStrong"
          numeric
          maxFontSizeMultiplier={1.3}
          tone={direction === 'up' ? 'gain' : direction === 'down' ? 'loss' : 'muted'}
          accessibilityLabel={`${
            direction === 'unchanged'
              ? 'unchanged'
              : `${direction} ${formatPercentHundredths(pct, 'negative-only')}`
          } since ${formatDate(change.from.date)}${otherDay ? `, NAV of ${formatDate(point.date)}` : ''}`}
        >
          {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)})
          {otherDay ? (
            <AppText variant="label" tone="muted" numeric>
              {` · ${formatDate(point.date)}`}
            </AppText>
          ) : null}
        </AppText>
      );
    } else if (point.date !== asOf) {
      status = (
        <AppText variant="label" tone="muted" numeric maxFontSizeMultiplier={1.3}>
          as of {formatDate(point.date)}
        </AppText>
      );
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          marginHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderTopLeftRadius: first ? radius.lg : 0,
          borderTopRightRadius: first ? radius.lg : 0,
          borderBottomLeftRadius: last ? radius.lg : 0,
          borderBottomRightRadius: last ? radius.lg : 0,
        },
      ]}
    >
      <SwipeRow actionLabel="Remove" onAction={remove}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the fund. Swipe left to remove."
          onPress={() =>
            router.push({ pathname: '/fund/[code]', params: { code: String(schemeCode), name: schemeName } })
          }
          style={({ pressed }) => [
            styles.row,
            { paddingHorizontal: spacing.lg, gap: spacing.md, backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
          ]}
        >
          <FundMark schemeName={schemeName} />
          <View style={[styles.flex, { gap: 2 }]}>
            <View style={[styles.line, { gap: spacing.md }]}>
              <AppText variant="rowTitle" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
                {title}
              </AppText>
              {nav}
            </View>
            <View style={[styles.line, styles.minLine, { gap: spacing.md }]}>
              <AppText variant="label" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
                {meta}
              </AppText>
              {status}
            </View>
          </View>
        </Pressable>
        {!last && (
          <View
            style={[styles.separator, { left: spacing.lg + FUND_MARK_SIZE + spacing.md, right: spacing.lg, backgroundColor: colors.hairline }]}
          />
        )}
      </SwipeRow>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: {
    height: WATCH_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  separator: { position: 'absolute', bottom: 0, height: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'center' },
  // Keeps the second line's height when a fund has no plan, change or status.
  minLine: { minHeight: 20 },
  flex: { flex: 1 },
});
