import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Animated, RefreshControl, StyleSheet, View, type LayoutChangeEvent, type ListRenderItem } from 'react-native';

import { WatchToggle } from '@/components/search/WatchToggle';
import { AppText } from '@/components/ui/AppText';
import { LargeTitle, ScreenHeader, TopBar, useCollapsingTitle } from '@/components/ui/ScreenHeader';
import { Banner } from '@/components/ui/Banner';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SampleBanner } from '@/components/holdings/SamplePortfolio';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { UndoToast } from '@/components/ui/UndoToast';
import { WATCH_ROW_HEIGHT, WatchRow } from '@/components/watchlist/WatchRow';
import { describeScheme } from '@/domain/schemeName';
import { SEARCH_SUGGESTIONS } from '@/domain/search';
import { useOnline } from '@/hooks/useOnline';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { WatchItem } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { easeNextLayout } from '@/components/ui/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const keyExtractor = (item: WatchItem) => String(item.schemeCode);

export default function WatchlistScreen() {
  const { colors, spacing } = useTheme();
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const unwatch = usePortfolioStore((s) => s.unwatch);
  const undoUnwatch = usePortfolioStore((s) => s.undoUnwatch);
  const reduced = useReducedMotion();
  const online = useOnline();
  const recentlyViewed = usePreferencesStore((s) => s.recentlyViewed);
  const queryClient = useQueryClient();
  useRefreshOnFocus('nav-latest');

  const [removed, setRemoved] = useState<{ item: WatchItem; index: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { scrollY, onScroll } = useCollapsingTitle();
  // The title is the list header; its height feeds getItemLayout so row offsets stay exact.
  const [headerHeight, setHeaderHeight] = useState(0);
  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setHeaderHeight((current) => (current === next ? current : next));
  }, []);
  const getItemLayout = useCallback(
    (_data: ArrayLike<WatchItem> | null | undefined, index: number) => ({
      length: WATCH_ROW_HEIGHT,
      offset: headerHeight + WATCH_ROW_HEIGHT * index,
      index,
    }),
    [headerHeight],
  );

  const onRemove = useCallback(
    (schemeCode: number) => {
      easeNextLayout(reduced);
      const result = unwatch(schemeCode);
      // A second removal replaces the toast; the first removal stays done.
      if (result !== null) setRemoved(result);
    },
    [unwatch, reduced],
  );
  const onUndo = useCallback(() => {
    if (removed === null) return;
    easeNextLayout(reduced);
    undoUnwatch(removed.item, removed.index);
  }, [removed, undoUnwatch, reduced]);
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
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Watchlist" />
        <SkeletonRows rowHeight={WATCH_ROW_HEIGHT} />
      </View>
    );
  }

  if (watchlist.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Watchlist" />
        <View style={[styles.flex, styles.centered]}>
          <EmptyState
            icon="star-outline"
            title="Your watchlist is empty"
            body="Tap ☆ on any fund to follow its latest NAV here."
          >
            {recentlyViewed.length > 0 && (
              // One-tap adds from funds you've already looked at.
              <View style={[styles.recent, { gap: spacing.xs, marginBottom: spacing.md }]}>
                <AppText variant="label" tone="muted">
                  Recently viewed
                </AppText>
                {recentlyViewed.slice(0, 4).map((fund) => (
                  <View key={fund.schemeCode} style={[styles.recentRow, { borderBottomColor: colors.border }]}>
                    <AppText variant="label" numberOfLines={1} style={styles.flex}>
                      {describeScheme(fund.schemeName).title}
                    </AppText>
                    <WatchToggle schemeCode={fund.schemeCode} schemeName={fund.schemeName} />
                  </View>
                ))}
              </View>
            )}
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
        </View>
        {toast}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <TopBar title="Watchlist" scrollY={scrollY} />
      <Animated.FlatList
        data={watchlist}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View onLayout={onHeaderLayout} style={{ paddingBottom: spacing.sm, gap: spacing.sm }}>
            <LargeTitle title="Watchlist" subtitle={`${watchlist.length} ${watchlist.length === 1 ? 'fund' : 'funds'}`} />
            {!online && (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Banner tone="info" text="Offline: showing saved NAVs" />
              </View>
            )}
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SampleBanner />
            </View>
          </View>
        }
        ListFooterComponent={
          <AppText variant="caption" tone="muted" style={{ padding: spacing.lg }}>
            Swipe a fund left to remove it.
          </AppText>
        }
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
  recent: { alignSelf: 'stretch' },
  recentRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
});
