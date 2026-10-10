import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav } from '@/domain/format';
import { isStale } from '@/domain/nav';
import { describeScheme } from '@/domain/schemeName';
import { useLatestNav } from '@/query/hooks';
import type { WatchItem } from '@/store/portfolioSchema';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { SchemeBadges } from '../search/SchemeBadges';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { Skeleton } from '../ui/Skeleton';

export const WATCH_ROW_HEIGHT = 76;

export interface WatchRowProps {
  item: WatchItem;
  onRemove: (schemeCode: number) => void;
}

/**
 * One watched fund with its latest NAV. Each row runs its own query, so one
 * failing scheme never blocks the others. The height never changes between states.
 */
export const WatchRow = memo(function WatchRow({ item, onRemove }: WatchRowProps) {
  const { colors, spacing } = useTheme();
  const { schemeCode, schemeName } = item;
  const title = useMemo(() => describeScheme(schemeName).title, [schemeName]);
  const latest = useLatestNav(schemeCode);
  const point = latest.data?.point;

  // Two lines, each split left | right, so every row lines up: title | NAV, then badges | date.
  // A row without plan or option badges keeps its title on the first line.
  let top;
  let bottom;
  if (latest.data === undefined && latest.isLoading) {
    top = <Skeleton width={72} height={16} />;
    bottom = <Skeleton width={88} height={12} />;
  } else if (latest.data === undefined) {
    // Failed, or paused offline with nothing saved.
    top = (
      <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
        Couldn't load NAV
      </AppText>
    );
    bottom = (
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
    top = (
      <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
        No NAV published
      </AppText>
    );
    bottom = null;
  } else {
    const stale = isStale(point.date, todayInIndia());
    top = (
      <AppText variant="heading" numeric maxFontSizeMultiplier={1.3}>
        {formatNav(point.nav)}
      </AppText>
    );
    bottom = (
      <View style={[styles.line, { gap: spacing.xs }]}>
        <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
          as of {formatDate(point.date)}
        </AppText>
        {stale && <Badge label="Stale" tone="warning" />}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, paddingLeft: spacing.lg, paddingRight: spacing.md, gap: spacing.md },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund"
        onPress={() =>
          router.push({ pathname: '/fund/[code]', params: { code: String(schemeCode), name: schemeName } })
        }
        style={({ pressed }) => [styles.main, { gap: spacing.xs, opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={[styles.line, { gap: spacing.md }]}>
          <AppText variant="label" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </AppText>
          {top}
        </View>
        <View style={[styles.line, styles.bottomLine, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <SchemeBadges name={schemeName} size="sm" />
          </View>
          {bottom}
        </View>
      </Pressable>
      <IconButton
        name="close-circle-outline"
        onPress={() => onRemove(schemeCode)}
        accessibilityLabel={`Remove ${title} from watchlist`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: WATCH_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  main: { flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center' },
  // Keeps the second line's height when a fund has no badges and no date.
  bottomLine: { minHeight: 22 },
  title: { flex: 1, fontWeight: '600' },
  flex: { flex: 1 },
});
