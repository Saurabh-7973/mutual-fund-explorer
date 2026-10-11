import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The active tab sits in a soft pill (the Material 3 pattern Android users already know). */
function TabIcon({ focused, color, on, off }: { focused: boolean; color: ColorValue; on: IconName; off: IconName }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        { borderRadius: radius.md, backgroundColor: focused ? colors.primarySoft : 'transparent' },
      ]}
    >
      <Ionicons name={focused ? on : off} color={String(color)} size={22} />
    </View>
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
