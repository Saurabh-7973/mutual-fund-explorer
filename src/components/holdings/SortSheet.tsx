import { Pressable, StyleSheet, View } from 'react-native';

import type { HoldingSort, SortDirection } from '@/domain/holdings';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { SegmentedRow } from '../ui/SegmentedRow';

export const SORT_OPTIONS = [
  { key: 'value', label: 'Current value', short: 'Value' },
  { key: 'returns', label: 'Returns %', short: 'Returns' },
  { key: 'day', label: 'Day change %', short: 'Day change' },
  { key: 'xirr', label: 'XIRR %', short: 'XIRR' },
  { key: 'name', label: 'Fund name', short: 'Name' },
] as const satisfies readonly { key: HoldingSort; label: string; short: string }[];

/** The direction a person expects first: biggest first for numbers, A first for names. */
export function naturalOrder(by: HoldingSort): readonly SortDirection[] {
  return by === 'name' ? ['asc', 'desc'] : ['desc', 'asc'];
}

/** How each direction reads for an option: numbers go high/low, names go A–Z. */
export function directionLabels(by: HoldingSort): { desc: string; asc: string } {
  return by === 'name' ? { asc: 'A to Z', desc: 'Z to A' } : { desc: 'High to low', asc: 'Low to high' };
}

export interface SortSheetProps {
  visible: boolean;
  by: HoldingSort;
  direction: SortDirection;
  onChange: (by: HoldingSort, direction: SortDirection) => void;
  onClose: () => void;
}

/**
 * Sort holdings, laid out like Groww's sheet: one choice per row, and the direction under
 * the chosen one only (so it's always clear what it applies to). Changes apply at once and
 * the list re-sorts behind the sheet; Done closes it.
 */
export function SortSheet({ visible, by, direction, onChange, onClose }: SortSheetProps) {
  const { colors, spacing } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="title" accessibilityRole="header">
        Sort by
      </AppText>
      <View accessibilityRole="radiogroup">
        {SORT_OPTIONS.map((option, i) => {
          const selected = option.key === by;
          const labels = directionLabels(option.key);
          return (
            <View
              key={option.key}
              style={[
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                { paddingBottom: selected ? spacing.md : 0 },
              ]}
            >
              <Pressable
                onPress={() => onChange(option.key, naturalOrder(option.key)[0] ?? 'desc')}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.option, { gap: spacing.md }]}
              >
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.textMuted }]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <AppText variant="body" style={styles.flex}>
                  {option.label}
                </AppText>
              </Pressable>
              {selected && (
                <View style={styles.direction}>
                  <SegmentedRow
                    variant="track"
                    accessibilityLabel="Order"
                    options={naturalOrder(option.key).map((key) => ({ key, label: labels[key] }))}
                    selected={direction}
                    onSelect={(next) => onChange(option.key, next)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Button label="Done" onPress={onClose} />
    </BottomSheet>
  );
}

const RADIO = 20;

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 4 },
  flex: { flex: 1 },
  radio: { width: RADIO, height: RADIO, borderRadius: RADIO / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: RADIO / 2, height: RADIO / 2, borderRadius: RADIO / 4 },
  // Indented to the option's text, so the direction reads as part of the choice above it.
  direction: { marginLeft: RADIO + 12 },
});
