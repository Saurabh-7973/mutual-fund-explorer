import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, LayoutAnimation, StyleSheet } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/theme/tokens';

/**
 * Small shared motions, each answering something the user did. Money never animates its
 * value (a counting number shows wrong amounts on the way); only how it appears does.
 */

/** Eases the next layout change (a row added or removed) instead of a jump. Nothing with reduced motion. */
export function easeNextLayout(reduced: boolean): void {
  if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.create(motion.base, 'easeInEaseOut', 'opacity'));
}

/**
 * Fades its child in again whenever `swapKey` changes after the first render: the eye
 * toggle swapping an amount for dots reads as a cross-fade, not a flicker.
 */
export function FadeOnSwap({ swapKey, children }: { swapKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(swapKey);
  useEffect(() => {
    if (previous.current === swapKey) return;
    previous.current = swapKey;
    if (reduced) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: motion.fast, useNativeDriver: true }).start();
  }, [swapKey, reduced, opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/**
 * Fades content in once, when it replaces a skeleton (`active`), so loaded data arrives
 * rather than pops. Content that was ready at once (cached) just shows.
 */
export function FadeInOnReady({ active, children }: { active: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(active ? 0 : 1)).current;
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: motion.fast, useNativeDriver: true }).start();
  }, [active, reduced, opacity]);
  return <Animated.View style={[styles.fill, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
