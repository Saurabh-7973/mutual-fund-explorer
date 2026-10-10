import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, Platform, StyleSheet, View, type ListRenderItem } from 'react-native';

import { FundGate, InvalidSchemeLink, fundDisplayName, type FundReady } from '@/components/fund/FundGate';
import { FundTitle } from '@/components/fund/FundTitle';
import { GapRowView, NAV_ROW_HEIGHT, NavHeaderRow, NavRowView } from '@/components/fund/NavRows';
import { AppText } from '@/components/ui/AppText';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { formatDate } from '@/domain/dates';
import { navListItems, type NavListItem } from '@/domain/nav';
import { parseSchemeCode } from '@/domain/search';
import { useFundSeries } from '@/query/hooks';
import { useTheme } from '@/theme/useTheme';

const keyExtractor = (item: NavListItem) => (item.kind === 'nav' ? `nav-${item.row.date}` : `gap-${item.to}`);
const getItemLayout = (_data: ArrayLike<NavListItem> | null | undefined, index: number) => ({
  length: NAV_ROW_HEIGHT,
  offset: NAV_ROW_HEIGHT * index,
  index,
});

export default function NavHistoryScreen() {
  const params = useLocalSearchParams<{ code: string; name?: string }>();
  const schemeCode = parseSchemeCode(params.code);
  if (schemeCode === null) return <InvalidSchemeLink />;
  return <NavHistoryContent schemeCode={schemeCode} paramName={params.name} />;
}

function NavHistoryContent({ schemeCode, paramName }: { schemeCode: number; paramName: string | undefined }) {
  const { colors } = useTheme();
  const series = useFundSeries(schemeCode);
  const name = fundDisplayName(series, paramName, schemeCode);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'NAV history' }} />
      <FundGate schemeCode={schemeCode} series={series} loading={<SkeletonRows count={12} rowHeight={NAV_ROW_HEIGHT} />}>
        {(ready) => <NavList ready={ready} schemeCode={schemeCode} name={name} />}
      </FundGate>
    </View>
  );
}

function NavList({ ready, schemeCode, name }: { ready: FundReady; schemeCode: number; name: string }) {
  const { colors, spacing } = useTheme();
  const { points, last } = ready;
  const items = useMemo(() => navListItems(points), [points]);
  const first = points[0];

  const renderItem = useCallback<ListRenderItem<NavListItem>>(
    ({ item }) =>
      item.kind === 'nav' ? <NavRowView row={item.row} /> : <GapRowView from={item.from} to={item.to} days={item.days} />,
    [],
  );

  return (
    <>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface }}>
        <FundTitle name={name} schemeCode={schemeCode} compact />
        {first !== undefined && (
          <AppText variant="label" tone="muted" numeric>
            {points.length} NAVs from {formatDate(first.date)} to {formatDate(last.date)}
          </AppText>
        )}
      </View>
      <View style={{ backgroundColor: colors.surface }}>
        <NavHeaderRow />
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={25}
        maxToRenderPerBatch={25}
        windowSize={11}
        removeClippedSubviews={Platform.OS === 'android'}
        ListFooterComponent={
          first !== undefined ? (
            <AppText variant="caption" tone="muted" style={{ padding: spacing.lg, textAlign: 'center' }}>
              Earliest NAV in the data: {formatDate(first.date)}.
            </AppText>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
