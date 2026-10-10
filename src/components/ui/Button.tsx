import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import type { IoniconName } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  icon?: IoniconName;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, icon }: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const inactive = disabled || loading;
  const look = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
    destructive: { bg: colors.dangerSurface, fg: colors.danger, border: colors.dangerSurface },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          opacity: inactive ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : icon !== undefined ? (
        <Ionicons name={icon} size={18} color={look.fg} />
      ) : null}
      <AppText variant="heading" style={{ color: look.fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
