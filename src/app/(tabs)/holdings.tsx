import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Placeholder: replaced in docs/BUILD_PROMPT.md, phase 2 or later.
export default function HoldingsScreen() {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, padding: spacing.lg, backgroundColor: colors.background }}>
      <Text style={[typography.body, { color: colors.textMuted }]}>Holdings screen: not built yet.</Text>
    </View>
  );
}
