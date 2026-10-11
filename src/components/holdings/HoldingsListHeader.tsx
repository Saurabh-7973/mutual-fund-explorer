import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

export interface HoldingsListHeaderProps {
  /** Short name of the sort ("Value") and how it reads to a screen reader. */
  sortShort: string;
  sortLabel: string;
  direction: 'asc' | 'desc';
  /** Short name of the figure the rows show ("Current"), and the full ones for screen readers. */
  columnShort: string;
  columnLabel: string;
  nextColumnLabel: string;
  onSort: () => void;
  onSwitchColumn: () => void;
}

/** "Your funds", with how the list is ordered and which figure the rows show as two small buttons. */
export function HoldingsListHeader({
  sortShort,
  sortLabel,
  direction,
  columnShort,
  columnLabel,
  nextColumnLabel,
  onSort,
  onSwitchColumn,
}: HoldingsListHeaderProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm }]}>
      <AppText variant="heading" accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.flex}>
        Your funds
      </AppText>
      <SmallButton
        label={sortShort}
        accessibilityLabel={`Sorted by ${sortLabel}. Change sort`}
        icon={direction === 'desc' ? 'arrow-down' : 'arrow-up'}
        onPress={onSort}
        colors={colors}
      />
      <SmallButton
        label={columnShort}
        accessibilityLabel={`Showing ${columnLabel}. Switch to ${nextColumnLabel}`}
        icon="chevron-down"
        onPress={onSwitchColumn}
        colors={colors}
      />
    </View>
  );
}

function SmallButton({
  label,
  accessibilityLabel,
  icon,
  onPress,
  colors,
}: {
  label: string;
  accessibilityLabel: string;
  icon: 'arrow-down' | 'arrow-up' | 'chevron-down';
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const { radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, borderRadius: radius.control, paddingHorizontal: spacing.md, gap: 6, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="labelStrong" tone="primary" maxFontSizeMultiplier={1.3} numberOfLines={1}>
        {label}
      </AppText>
      <Ionicons name={icon} size={14} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  button: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
});
