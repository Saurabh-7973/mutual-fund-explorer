import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View, type ListRenderItem } from 'react-native';

import { SchemeRow, SCHEME_ROW_HEIGHT } from '@/components/search/SchemeRow';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { SkeletonRows } from '@/components/ui/Skeleton';
import {
  SEARCH_RESULT_CAP,
  SEARCH_SUGGESTIONS,
  filterSchemes,
  mayBeTruncated,
  schemeCodeInQuery,
} from '@/domain/search';
import type { SchemeSearchResult } from '@/domain/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOnline } from '@/hooks/useOnline';
import { useSchemeSearch } from '@/query/hooks';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const keyExtractor = (item: SchemeSearchResult) => String(item.schemeCode);
const getItemLayout = (_data: ArrayLike<SchemeSearchResult> | null | undefined, index: number) => ({
  length: SCHEME_ROW_HEIGHT,
  offset: SCHEME_ROW_HEIGHT * index,
  index,
});

export default function ExploreScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState('');
  const [directOnly, setDirectOnly] = useState(false);
  const [growthOnly, setGrowthOnly] = useState(false);
  const debounced = useDebouncedValue(text, 300);
  const { query, normalized, enabled } = useSchemeSearch(debounced);
  const online = useOnline();

  // The Watchlist empty state links here with a suggested query.
  useEffect(() => {
    if (typeof params.q === 'string') setText(params.q);
  }, [params.q]);

  // Offline, a new search pauses and keepPreviousData would show the old results as "Searching…" forever.
  const pausedOverOldResults = query.isPlaceholderData && query.fetchStatus === 'paused';
  const data = pausedOverOldResults ? undefined : query.data;
  const filtered = useMemo(
    () => (data === undefined ? [] : filterSchemes(data, { directOnly, growthOnly })),
    [data, directOnly, growthOnly],
  );
  const codeInQuery = schemeCodeInQuery(normalized);
  const typedLength = text.trim().length;

  const renderItem = useCallback<ListRenderItem<SchemeSearchResult>>(({ item }) => <SchemeRow scheme={item} />, []);
  const clearFilters = useCallback(() => {
    setDirectOnly(false);
    setGrowthOnly(false);
  }, []);

  const codeRow =
    enabled && codeInQuery !== null ? (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/fund/[code]', params: { code: String(codeInQuery) } })}
        style={({ pressed }) => [
          styles.codeRow,
          { borderBottomColor: colors.border, paddingHorizontal: spacing.lg, gap: spacing.md, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="open-outline" size={20} color={colors.primary} />
        <AppText tone="primary" style={styles.flex}>
          Open scheme code {codeInQuery}
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    ) : null;

  const renderBody = () => {
    if (!enabled) {
      return (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {typedLength > 0 && typedLength < 3 && (
            <AppText tone="muted" variant="label">
              Type at least 3 characters
            </AppText>
          )}
          <AppText variant="heading" accessibilityRole="header">
            Start with a collection
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {SEARCH_SUGGESTIONS.map((item) => (
              <Chip key={item.query} label={item.label} onPress={() => setText(item.query)} />
            ))}
          </View>
        </View>
      );
    }

    if (data === undefined) {
      if (query.isLoading) {
        return (
          <>
            {codeRow}
            <SkeletonRows rowHeight={SCHEME_ROW_HEIGHT} />
          </>
        );
      }
      // An error, or a search paused because the phone is offline.
      if (query.isError || query.fetchStatus === 'paused') {
        return (
          <>
            {codeRow}
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </>
        );
      }
      return codeRow;
    }

    if (data.length === 0) {
      return (
        codeRow ?? (
          <EmptyState
            icon="search-outline"
            title={`No schemes match “${normalized}”`}
            body="Try the fund house (for example HDFC), a category (liquid, index) or fewer words."
          />
        )
      );
    }

    return (
      <>
        <View style={[styles.filters, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm }]}>
          <Chip label="Direct only" selected={directOnly} onPress={() => setDirectOnly((v) => !v)} />
          <Chip label="Growth only" selected={growthOnly} onPress={() => setGrowthOnly((v) => !v)} />
          <AppText variant="caption" tone="muted" numeric style={styles.count}>
            Showing {filtered.length} of {data.length}
          </AppText>
        </View>
        {query.isPlaceholderData && (
          <View style={[styles.searching, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <AppText variant="caption" tone="muted">
              Searching…
            </AppText>
          </View>
        )}
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={{ opacity: query.isPlaceholderData ? 0.6 : 1 }}
          ListHeaderComponent={codeRow}
          ListEmptyComponent={
            <EmptyState
              icon="funnel-outline"
              title="No matching plans in these results"
              action={{ label: 'Clear filters', onPress: clearFilters }}
            />
          }
          ListFooterComponent={
            mayBeTruncated(data.length) ? (
              <AppText variant="caption" tone="muted" style={{ padding: spacing.lg, textAlign: 'center' }}>
                Showing the first {SEARCH_RESULT_CAP} matches. Add more words to narrow the search.
              </AppText>
            ) : null
          }
        />
      </>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <View
          style={[
            styles.field,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingLeft: spacing.md,
              paddingRight: spacing.sm,
              gap: spacing.sm,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search funds, e.g. Parag Parikh Flexi Cap"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search mutual funds"
            style={[typography.body, styles.input, { color: colors.text }]}
          />
          {text.length > 0 && <IconButton name="close-circle" onPress={() => setText('')} accessibilityLabel="Clear search" />}
        </View>
        {!online && (
          <Banner tone="warning" text="You're offline. Search needs a connection; your watchlist still shows saved NAVs." />
        )}
      </View>
      <View style={styles.flex}>{renderBody()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, paddingVertical: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  filters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  count: { marginLeft: 'auto' },
  searching: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  codeRow: {
    height: SCHEME_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
