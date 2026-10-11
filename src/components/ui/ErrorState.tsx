import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { describeError } from '@/api/errors';
import { useOnline } from '@/hooks/useOnline';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Fits inside a list row or card. */
  compact?: boolean;
}

/** Says what went wrong and what to do next, with an optional Retry. */
export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  const { colors, spacing } = useTheme();
  const online = useOnline();
  const copy = describeError(error, online);

  if (compact) {
    return (
      <View style={[styles.compact, { gap: spacing.md }]} accessibilityRole="alert">
        <View style={styles.flex}>
          <AppText variant="label" tone="danger">
            {copy.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {copy.detail}
          </AppText>
        </View>
        {onRetry !== undefined && <Button label="Retry" onPress={onRetry} variant="secondary" />}
      </View>
    );
  }

  return (
    <View style={[styles.full, { padding: spacing.xl, gap: spacing.md }]} accessibilityRole="alert">
      <View style={[styles.badge, { backgroundColor: online ? colors.dangerSurface : colors.surfaceMuted }]}>
        <Ionicons
          name={online ? 'alert-circle-outline' : 'cloud-offline-outline'}
          size={30}
          color={online ? colors.danger : colors.textMuted}
        />
      </View>
      <AppText variant="heading" style={styles.center}>
        {copy.title}
      </AppText>
      <AppText tone="muted" style={styles.center}>
        {copy.detail}
      </AppText>
      {onRetry !== undefined && <Button label="Retry" onPress={onRetry} icon="refresh" />}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  full: { alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
