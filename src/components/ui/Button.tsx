import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { motion } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import type { IoniconName } from './icons';

/** 'surface' is for a button on a tinted panel (white, green text), where the tonal one would vanish. */
export type ButtonVariant = 'primary' | 'secondary' | 'surface' | 'destructive' | 'ghost';

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
  const reduced = useReducedMotion();
  // The button gives a little under the finger and springs back: a touch is felt before the result.
  const scale = useRef(new Animated.Value(1)).current;
  const pressTo = (toValue: number) => {
    if (reduced) return;
    Animated.timing(scale, { toValue, duration: motion.fast / 2, useNativeDriver: true }).start();
  };
  const look = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    // Tonal: a green tint that reads on the page, on white cards and on sheets alike.
    secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    surface: { bg: colors.surface, fg: colors.primary, border: colors.surface },
    destructive: { bg: colors.dangerSurface, fg: colors.danger, border: colors.dangerSurface },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => pressTo(0.97)}
        onPressOut={() => pressTo(1)}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: look.bg,
            borderColor: look.border,
            borderRadius: radius.control,
            paddingHorizontal: spacing.xl,
            gap: spacing.sm,
            opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
