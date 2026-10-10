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

  let right;
  if (latest.data === undefined && latest.isLoading) {
    right = (
      <View style={[styles.right, { gap: spacing.xs }]}>
        <Skeleton width={72} height={16} />
        <Skeleton width={88} height={12} />
      </View>
    );
  } else if (latest.data === undefined) {
    // Failed, or paused offline with nothing saved.
    right = (
      <View style={[styles.right, { gap: 2 }]}>
        <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
          Couldn't load NAV
        </AppText>
        <Pressable
          onPress={() => void latest.refetch()}
          accessibilityRole="button"
          accessibilityLabel={`Retry loading the NAV for ${title}`}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <AppText variant="label" tone="primary" maxFontSizeMultiplier={1.3}>
            Retry
          </AppText>
        </Pressable>
      </View>
    );
  } else if (point === null || point === undefined) {
    right = (
      <View style={styles.right}>
        <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
          No NAV published
        </AppText>
      </View>
    );
  } else {
    const stale = isStale(point.date, todayInIndia());
    right = (
      <View style={[styles.right, { gap: 2 }]}>
        <AppText variant="heading" numeric maxFontSizeMultiplier={1.3}>
          {formatNav(point.nav)}
        </AppText>
        {/* The badge sits beside the date it qualifies, keeping the row two lines tall. */}
        <View style={[styles.dateLine, { gap: spacing.xs }]}>
          <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
            as of {formatDate(point.date)}
          </AppText>
          {stale && <Badge label="Stale" tone="warning" />}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.border, paddingLeft: spacing.lg, paddingRight: spacing.md, gap: spacing.md }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund"
        onPress={() => router.push({ pathname: '/fund/[code]', params: { code: String(schemeCode), name: schemeName } })}
        style={({ pressed }) => [styles.main, { gap: spacing.md, opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={[styles.left, { gap: spacing.xs }]}>
          <AppText variant="label" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </AppText>
          <SchemeBadges name={schemeName} size="sm" />
        </View>
        {right}
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
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH },
  left: { flex: 1 },
  title: { fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  dateLine: { flexDirection: 'row', alignItems: 'center' },
});
