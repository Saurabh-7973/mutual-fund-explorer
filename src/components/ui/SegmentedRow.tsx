import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export interface SegmentedOption<K extends string> {
  key: K;
  label: string;
  disabled?: boolean;
}

export interface SegmentedRowProps<K extends string> {
  options: readonly SegmentedOption<K>[];
  selected: K;
  onSelect: (key: K) => void;
  /** Read before each option, e.g. "Chart range". */
  accessibilityLabel: string;
}

/**
 * A row of equal-width text options with a soft pill on the chosen one: lighter than a row
 * of bordered chips, and seven ranges still fit a small phone.
 */
export function SegmentedRow<K extends string>({ options, selected, onSelect, accessibilityLabel }: SegmentedRowProps<K>) {
  const { colors, radius } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            disabled={option.disabled}
            accessibilityRole="tab"
            accessibilityLabel={`${accessibilityLabel}: ${option.label}`}
            accessibilityState={{ selected: isSelected, disabled: option.disabled }}
            style={styles.cell}
          >
            <View
              style={[
                styles.pill,
                { borderRadius: radius.pill, backgroundColor: isSelected ? colors.primarySoft : 'transparent' },
              ]}
            >
              <AppText
                variant="labelStrong"
                tone={isSelected ? 'primary' : 'muted'}
                maxFontSizeMultiplier={1.3}
                style={option.disabled && styles.disabled}
              >
                {option.label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 6 },
  disabled: { opacity: 0.35 },
});
