import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  flex: { flex: 1 },
});
