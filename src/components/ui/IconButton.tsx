import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { IoniconName } from './icons';

export interface IconButtonProps {
  name: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  /** Set for toggles, so screen readers announce the state. */
  selected?: boolean;
  disabled?: boolean;
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
  selected,
  disabled = false,
}: IconButtonProps) {
  const { colors } = useTheme();
  const slop = Math.max(0, (MIN_TOUCH - size) / 2);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, ...(selected !== undefined && { selected }) }}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={name} size={size} color={color ?? colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});
