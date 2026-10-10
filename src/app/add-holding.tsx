import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Placeholder: replaced in docs/BUILD_PROMPT.md, phase 5.
export default function AddHoldingScreen() {
  const { code } = useLocalSearchParams<{ code: string; name: string }>();
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, padding: spacing.lg, backgroundColor: colors.background }}>
      <Text style={[typography.body, { color: colors.textMuted }]}>Add holding for {code}: not built yet.</Text>
    </View>
  );
}
