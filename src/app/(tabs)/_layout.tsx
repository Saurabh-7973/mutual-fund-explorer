import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { createContext, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ColorValue,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/ui/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** How far a tab's icon is pressed in (1 at rest), shared from its button to its icon. */
const PressScale = createContext<Animated.Value | null>(null);

/**
 * The active tab sits in a soft pill that grows in from the centre as its icon fills (the
 * Material 3 pattern Android users already know); the icon gives a little under the finger.
 */
function TabIcon({ focused, color, on, off }: { focused: boolean; color: ColorValue; on: IconName; off: IconName }) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  const press = useContext(PressScale);
  const shown = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      shown.setValue(focused ? 1 : 0);
      return;
    }
    Animated.timing(shown, { toValue: focused ? 1 : 0, duration: motion.base, useNativeDriver: true }).start();
  }, [focused, reduced, shown]);
  return (
    <Animated.View style={styles.pill}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius.md,
            backgroundColor: colors.primarySoft,
            opacity: shown,
            transform: [{ scaleX: shown.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          },
        ]}
      />
      <Animated.View style={press !== null && { transform: [{ scale: press }] }}>
        <Ionicons name={focused ? on : off} color={String(color)} size={22} />
      </Animated.View>
    </Animated.View>
  );
}

/** What the tab bar hands each tab's button (React Navigation's bottom-tab button props). */
interface TabButtonProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  'aria-selected'?: boolean;
  [prop: string]: unknown;
}

/**
 * Each tab's button: everything the tab bar passes (role, selected state, label, testID,
 * press handlers) goes through, but without Android's grey ripple or an opacity flash. The
 * feedback lives in the pill and the icon instead.
 */
function TabButton({
  children,
  style,
  onPress,
  onLongPress,
  android_ripple: _ripple,
  pressOpacity: _opacity,
  hoverEffect: _hover,
  href: _href,
  ...rest
}: TabButtonProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const selected = rest['aria-selected'] === true;
  const pressTo = (toValue: number) => {
    if (reduced) return;
    if (toValue < 1) Animated.timing(scale, { toValue, duration: motion.fast / 2, useNativeDriver: true }).start();
    else Animated.spring(scale, { toValue, friction: 4, tension: 160, useNativeDriver: true }).start();
  };
  return (
    <Pressable
      {...rest}
      style={style}
      onPress={(event) => {
        // A tick only when the tab actually changes; re-pressing the open tab stays quiet.
        if (!selected) haptic.tick();
        onPress?.(event);
      }}
      onLongPress={onLongPress ?? undefined}
      onPressIn={() => pressTo(0.92)}
      onPressOut={() => pressTo(1)}
    >
      <PressScale.Provider value={scale}>{children}</PressScale.Provider>
    </Pressable>
  );
}

// `Tabs` from 'expo-router' itself is deprecated in SDK 57; the JS tab bar lives in 'expo-router/js-tabs'.
// Each tab draws its own large title (ScreenHeader), so the navigator's header is off.
export default function TabsLayout() {
  const { colors, typography } = useTheme();
  // Edge-to-edge Android draws under the gesture bar, so the bar's height includes the bottom inset.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <TabButton {...props} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // The bar has a fixed height, so labels grow with the system text size only up to 1.3×
        // (like list rows); beyond that they'd run into the gesture bar.
        tabBarLabel: ({ color, children }) => (
          <Text
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            style={{ color, fontSize: typography.caption.fontSize, fontFamily: typography.labelStrong.fontFamily, marginTop: 2 }}
          >
            {children}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(8, insets.bottom),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} on="search" off="search-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} on="star" off="star-outline" />,
        }}
      />
      <Tabs.Screen
        name="holdings"
        options={{
          title: 'Holdings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} on="pie-chart" off="pie-chart-outline" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
});
