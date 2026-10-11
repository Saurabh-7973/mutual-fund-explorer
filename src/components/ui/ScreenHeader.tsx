import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export interface ScreenHeaderProps {
  title: string;
  /** One short line under the title, e.g. what the screen's data is. */
  subtitle?: string;
  /** The screen's own action, top right. */
  right?: ReactNode;
}

/** A tab's large title, drawn on the page itself instead of in a separate bar. */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.row,
        { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
      ]}
    >
      <View style={[styles.flex, { gap: 2 }]}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle !== undefined && (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        )}
      </View>
      {right}
    </View>
  );
}


/**
 * How far the list scrolls while the top bar's small title fades in. The large title starts
 * sliding under the bar at once, so the small one is fully in by the time the large one's
 * 36-pt line is covered: the name is never half-sliced with nothing in its place.
 */
const COLLAPSE_START = 4;
const COLLAPSE_END = 30;

/**
 * A large title that scrolls away with the content, and a slim bar that keeps the screen's
 * action and fades in a small title once the large one has gone (the Android and iOS
 * large-title pattern). Wire `onScroll` to an Animated list; it runs on the native driver.
 */
export function useCollapsingTitle() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );
  return { scrollY, onScroll };
}

export function TopBar({ title, right, scrollY }: { title: string; right?: ReactNode; scrollY: Animated.Value }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const shown = scrollY.interpolate({
    inputRange: [COLLAPSE_START, COLLAPSE_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top, height: insets.top + 52, paddingHorizontal: spacing.lg, backgroundColor: colors.background },
      ]}
    >
      <Animated.View style={[styles.flex, { opacity: shown }]} importantForAccessibility="no-hide-descendants">
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
      </Animated.View>
      {right}
      <Animated.View style={[styles.edge, { backgroundColor: colors.border, opacity: shown }]} />
    </View>
  );
}

/**
 * The large title and its status line, placed at the top of the scrolling content. Given the
 * list's `scrollY`, the title fades out as it slides under the bar while the bar's small
 * title fades in, so the name is never shown sliced.
 */
export function LargeTitle({ title, subtitle, scrollY }: { title: string; subtitle?: string; scrollY?: Animated.Value }) {
  const { spacing } = useTheme();
  const opacity =
    scrollY?.interpolate({ inputRange: [COLLAPSE_START, COLLAPSE_END], outputRange: [1, 0], extrapolate: 'clamp' }) ?? 1;
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, gap: 2 }}>
      <Animated.View style={{ opacity }}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
      </Animated.View>
      {subtitle !== undefined && (
        <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
});
