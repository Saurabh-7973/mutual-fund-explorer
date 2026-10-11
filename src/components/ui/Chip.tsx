import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

const CHIP_HEIGHT = 36;
const SLOP = (MIN_TOUCH - CHIP_HEIGHT) / 2;

export interface ChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export function Chip({ label, onPress, selected = false, disabled = false }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: SLOP, bottom: SLOP }}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.sm,
          paddingHorizontal: spacing.md,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.infoSurface : colors.surface,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppText variant="label" tone={selected ? 'primary' : 'default'} maxFontSizeMultiplier={1.3}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: CHIP_HEIGHT,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
