import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface UndoToastProps {
  /** null hides the toast. A new message restarts the timer. */
  message: string | null;
  onUndo: () => void;
  onHide: () => void;
  durationMs?: number;
}

/**
 * A bar pinned to the bottom of the screen. In a tab screen the screen already ends
 * above the tab bar, so only the side insets are applied (for landscape notches).
 */
export function UndoToast({ message, onUndo, onHide, durationMs = 5000 }: UndoToastProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [message, onHide, durationMs]);

  if (message === null) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          bottom: spacing.md,
          left: Math.max(spacing.lg, insets.left),
          right: Math.max(spacing.lg, insets.right),
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingLeft: spacing.lg,
          paddingRight: spacing.xs,
        },
      ]}
    >
      <AppText variant="label" numberOfLines={2} style={styles.text}>
        {message}
      </AppText>
      <Button
        label="Undo"
        variant="ghost"
        onPress={() => {
          onUndo();
          onHide();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
  },
  text: { flex: 1 },
});
