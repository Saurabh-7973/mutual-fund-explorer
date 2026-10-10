import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

/** How far to drag before letting go removes the row. */
const COMMIT_DISTANCE = 96;

export interface SwipeRowProps {
  children: ReactNode;
  /** Shown behind the row and read out as the screen-reader action. */
  actionLabel: string;
  /**
   * Called when the swipe passes the commit distance. Return true to let the row
   * slide away, or false to spring it back (for example after a confirmation is cancelled).
   */
  onAction: () => boolean | Promise<boolean>;
}

/**
 * Swipe left to reveal and run one destructive action, as list rows do in most
 * investing apps. Built on a Gesture Handler pan and React Native's Animated, so it
 * runs in Expo Go without Reanimated. Screen-reader users get the same action from
 * the accessibility actions menu, since a swipe can't be discovered by ear.
 */
export function SwipeRow({ children, actionLabel, onAction }: SwipeRowProps) {
  const { colors, spacing } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const gesture = useMemo(() => {
    const settle = (toValue: number) =>
      Animated.spring(translateX, { toValue, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
    const commit = async () => {
      Animated.timing(translateX, { toValue: -COMMIT_DISTANCE, duration: 120, useNativeDriver: true }).start();
      const done = await onAction();
      if (!done) settle(0);
    };
    return (
      Gesture.Pan()
        .runOnJS(true)
        // Horizontal drags only, so vertical scrolling and taps keep working.
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onUpdate((event) => translateX.setValue(Math.min(0, event.translationX)))
        .onEnd((event) => {
          if (event.translationX <= -COMMIT_DISTANCE || event.velocityX < -900) void commit();
          else settle(0);
        })
    );
  }, [onAction, translateX]);

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'remove') void onAction();
  };

  // The red panel fades in as the row moves, so a short accidental drag doesn't flash it.
  const panelOpacity = translateX.interpolate({
    inputRange: [-COMMIT_DISTANCE, -16, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      accessibilityActions={[{ name: 'remove', label: actionLabel }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <Animated.View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          StyleSheet.absoluteFill,
          styles.panel,
          { backgroundColor: colors.dangerSurface, paddingRight: spacing.xl, gap: spacing.sm, opacity: panelOpacity },
        ]}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
        <AppText variant="label" style={{ color: colors.danger }}>
          {actionLabel}
        </AppText>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={{ backgroundColor: colors.background, transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
});
