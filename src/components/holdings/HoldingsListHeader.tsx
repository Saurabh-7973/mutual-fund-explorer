import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

export interface HoldingsListHeaderProps {
  /** Short name of the sort ("Value") and how it reads to a screen reader. */
  sortShort: string;
  sortLabel: string;
  direction: 'asc' | 'desc';
  columnLabel: string;
  nextColumnLabel: string;
  onSort: () => void;
  onSwitchColumn: () => void;
}

/** Above the Holdings rows: how they're ordered on the left, which figure they show on the right. */
export function HoldingsListHeader({
  sortShort,
  sortLabel,
  direction,
  columnLabel,
  nextColumnLabel,
  onSort,
  onSwitchColumn,
}: HoldingsListHeaderProps) {
  const { colors, spacing } = useTheme();
  // One figure per row keeps the list calm; this switches which one.
  // Groww's layout: how the list is ordered on the left, which figure the rows show on the right.
  return (
    <View style={[styles.listHeader, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
      <Pressable
        onPress={onSort}
        accessibilityRole="button"
        accessibilityLabel={`Sorted by ${sortLabel}. Change sort`}
        hitSlop={12}
        style={[styles.inline, { gap: spacing.xs }]}
      >
        <Ionicons name="swap-vertical" size={14} color={colors.primary} />
        <AppText variant="label" maxFontSizeMultiplier={1.3} tone="primary" numberOfLines={1}>
          {sortShort}
        </AppText>
        <Ionicons name={direction === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} color={colors.primary} />
      </Pressable>
      <View style={styles.flex} />
      <Pressable
        onPress={onSwitchColumn}
        accessibilityRole="button"
        accessibilityLabel={`Showing ${columnLabel}. Switch to ${nextColumnLabel}`}
        hitSlop={12}
        style={[styles.inline, { gap: spacing.xs }]}
      >
        <Ionicons name="code-outline" size={14} color={colors.primary} />
        <AppText variant="label" maxFontSizeMultiplier={1.3} tone="primary" style={[styles.dotted, { borderBottomColor: colors.primary }]}>
          {columnLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center' },
  // A dotted underline marks the column label as tappable, as Groww does.
  dotted: { borderBottomWidth: 1, borderStyle: 'dashed' },
});
