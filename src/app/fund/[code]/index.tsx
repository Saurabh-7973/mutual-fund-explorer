import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Placeholder: replaced in docs/BUILD_PROMPT.md, phase 4.
export default function FundScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, padding: spacing.lg, backgroundColor: colors.background }}>
      <Text style={[typography.body, { color: colors.textMuted }]}>Fund {code}: not built yet.</Text>
    </View>
  );
}
