import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export default function NotFoundScreen() {
  const { colors, spacing, typography } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background }}>
        <Text style={[typography.title, { color: colors.text }]}>This screen doesn’t exist.</Text>
        <Link href="/" style={[typography.heading, { color: colors.primary }]}>
          Go to Explore
        </Link>
      </View>
    </>
  );
}
