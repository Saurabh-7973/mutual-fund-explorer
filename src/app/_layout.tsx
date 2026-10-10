import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { usePendingLotResolver } from '@/hooks/usePendingLotResolver';
import { QueryProvider } from '@/query/QueryProvider';
import { useTheme } from '@/theme/useTheme';

/** Work that must run whichever screen is open. Rendered inside the providers. */
function BackgroundTasks() {
  usePendingLotResolver();
  return null;
}

export default function RootLayout() {
  const theme = useTheme();
  const navigationTheme = useMemo<Theme>(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.loss,
      },
    };
  }, [theme]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryProvider>
        <ThemeProvider value={navigationTheme}>
          <BackgroundTasks />
          <Stack
            screenOptions={{
              headerBackButtonDisplayMode: 'minimal',
              // Headers sit on the page colour with no shadow, so a screen reads as one surface.
              headerStyle: { backgroundColor: theme.colors.background },
              headerShadowVisible: false,
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontSize: theme.typography.heading.fontSize, fontWeight: theme.typography.heading.fontWeight },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="fund/[code]/index" options={{ title: '' }} />
            <Stack.Screen name="fund/[code]/navs" options={{ title: 'NAV history' }} />
            <Stack.Screen name="add-holding" options={{ presentation: 'modal', title: 'Add holding' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

/** Last-resort screen for a render error anywhere below this layout. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md }]}>
      <Text style={[typography.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[typography.body, { color: colors.textMuted }]}>
        The app hit an unexpected error. Your watchlist and holdings are saved on this device.
      </Text>
      {__DEV__ && <Text style={[typography.caption, { color: colors.textMuted }]}>{error.message}</Text>}
      <Pressable accessibilityRole="button" onPress={retry} style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={[typography.heading, { color: colors.onPrimary }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { flex: 1, justifyContent: 'center' },
  button: { minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
