import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tighter padding, for a sheet with a dense body such as the calendar grid. */
  compact?: boolean;
}

/**
 * A sheet that rises from the bottom over a dimmed page. The dim fades while the sheet
 * glides up by its own height (the system's slide animation moved the dim layer too, as one
 * slab), and both reverse on close. With reduced motion the sheet simply appears.
 */
export function BottomSheet({ visible, onClose, children, compact = false }: BottomSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const [height, setHeight] = useState(600);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? motion.base : motion.fast,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, mounted, reduced, progress]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setHeight((current) => (current === next ? current : next));
  };

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        onLayout={onLayout}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: compact ? spacing.lg : spacing.xl,
            paddingBottom: Math.max(compact ? spacing.lg : spacing.xl, insets.bottom + (compact ? spacing.sm : spacing.md)),
            gap: spacing.md,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // A fixed dim over any theme: the sheet is the only lit surface.
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: -8 },
});
