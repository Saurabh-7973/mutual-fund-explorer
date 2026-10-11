import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import type { IoniconName } from './icons';

export interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
  children?: ReactNode;
}

/** "Nothing here yet", with one next step. */
export function EmptyState({ icon, title, body, action, children }: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.root, { padding: spacing.xl, gap: spacing.md }]}>
      {/* The icon sits in a soft circle: a quiet focal point, not a bare glyph. */}
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="heading" accessibilityRole="header" style={styles.center}>
        {title}
      </AppText>
      {body !== undefined && (
        <AppText tone="muted" style={styles.center}>
          {body}
        </AppText>
      )}
      {action !== undefined && <Button label={action.label} onPress={action.onPress} variant="secondary" />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  center: { textAlign: 'center' },
});
