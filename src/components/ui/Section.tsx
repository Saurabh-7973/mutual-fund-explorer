import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { MIN_TOUCH, motion } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export interface SectionProps {
  title: string;
  /**
   * The section's one-line takeaway, shown while it is closed, so a collapsed page still
   * answers the question each section is about.
   */
  summary?: ReactNode;
  initiallyOpen?: boolean;
  children: ReactNode;
}

/**
 * A titled block that opens on tap: detail stays one tap away instead of all on screen at
 * once. Opening eases the page apart and turns the chevron, so the eye sees where the
 * content came from; with reduced motion it simply appears.
 */
export function Section({ title, summary, initiallyOpen = false, children }: SectionProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: reduced ? 0 : motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [open, reduced, turn]);
  const toggle = () => {
    if (!reduced) {
      LayoutAnimation.configureNext(LayoutAnimation.create(motion.base, 'easeInEaseOut', 'opacity'));
    }
    setOpen((value) => !value);
  };
  return (
    <View
      style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? 'Collapses this section' : 'Expands this section'}
        style={({ pressed }) => [
          styles.header,
          { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.flex, { gap: 2 }]}>
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          {!open && summary !== undefined && summary}
        </View>
        <Animated.View
          style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Animated.View>
      </Pressable>
      {open && <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH },
  flex: { flex: 1 },
});
