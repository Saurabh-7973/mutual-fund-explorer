import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { UndoToast } from '@/components/ui/UndoToast';
import { WATCH_ROW_HEIGHT, WatchRow } from '@/components/watchlist/WatchRow';
import { describeScheme } from '@/domain/schemeName';
import { SEARCH_SUGGESTIONS } from '@/domain/search';
import { useOnline } from '@/hooks/useOnline';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { WatchItem } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const keyExtractor = (item: WatchItem) => String(item.schemeCode);
const getItemLayout = (_data: ArrayLike<WatchItem> | null | undefined, index: number) => ({
  length: WATCH_ROW_HEIGHT,
  offset: WATCH_ROW_HEIGHT * index,
  index,
});

export default function WatchlistScreen() {
  const { colors, spacing } = useTheme();
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const unwatch = usePortfolioStore((s) => s.unwatch);
  const undoUnwatch = usePortfolioStore((s) => s.undoUnwatch);
  const online = useOnline();
  const queryClient = useQueryClient();
  useRefreshOnFocus('nav-latest');

  const [removed, setRemoved] = useState<{ item: WatchItem; index: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRemove = useCallback(
    (schemeCode: number) => {
      const result = unwatch(schemeCode);
      // A second removal replaces the toast; the first removal stays done.
      if (result !== null) setRemoved(result);
    },
    [unwatch],
  );
  const onUndo = useCallback(() => {
    if (removed !== null) undoUnwatch(removed.item, removed.index);
  }, [removed, undoUnwatch]);
  const hideToast = useCallback(() => setRemoved(null), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['nav-latest'], type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const renderItem = useCallback<ListRenderItem<WatchItem>>(
    ({ item }) => <WatchRow item={item} onRemove={onRemove} />,
    [onRemove],
  );

  const toast = (
    <UndoToast
      // Remount per removal, so two funds with the same title still restart the timer.
      key={removed?.item.schemeCode ?? 'none'}
      message={removed !== null ? `Removed ${describeScheme(removed.item.schemeName).title}` : null}
      onUndo={onUndo}
      onHide={hideToast}
    />
  );

  if (!hydrated) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: spacing.md }]}>
        <SkeletonRows rowHeight={WATCH_ROW_HEIGHT} />
      </View>
    );
  }

  if (watchlist.length === 0) {
    return (
      <View style={[styles.flex, styles.centered, { backgroundColor: colors.background }]}>
        <EmptyState icon="star-outline" title="Your watchlist is empty" body="Tap ☆ on any fund to follow its latest NAV here.">
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {SEARCH_SUGGESTIONS.map((item) => (
              <Chip
                key={item.query}
                label={item.label}
                onPress={() => router.navigate({ pathname: '/', params: { q: item.query } })}
              />
            ))}
          </View>
        </EmptyState>
        {toast}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Outside the list, so getItemLayout offsets stay exact. */}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        {!online && <Banner tone="info" text="Offline: showing saved NAVs" />}
        <AppText variant="caption" tone="muted">
          Latest NAVs from mfapi.in. A NAV is published after market close, so each date shows the business day
          it's for.
        </AppText>
      </View>
      <FlatList
        data={watchlist}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
        // Room for the Undo bar, so it never covers the last row.
        contentContainerStyle={{ paddingBottom: removed !== null ? MIN_TOUCH + spacing.xl * 2 : spacing.lg }}
      />
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
