import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import type { IoniconName } from './icons';

export type BannerTone = 'info' | 'warning' | 'error';

export interface BannerProps {
  tone: BannerTone;
  text: string;
  action?: { label: string; onPress: () => void };
}

export function Banner({ tone, text, action }: BannerProps) {
  const { colors, radius, spacing } = useTheme();
  const looks: Record<BannerTone, { bg: string; fg: string; icon: IoniconName }> = {
    info: { bg: colors.infoSurface, fg: colors.info, icon: 'information-circle-outline' },
    warning: { bg: colors.warningSurface, fg: colors.warning, icon: 'warning-outline' },
    error: { bg: colors.dangerSurface, fg: colors.danger, icon: 'alert-circle-outline' },
  };
  const look = looks[tone];
  return (
    <View
      accessibilityRole={tone === 'info' ? 'summary' : 'alert'}
      style={[
        styles.row,
        { backgroundColor: look.bg, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
      ]}
    >
      <Ionicons name={look.icon} size={20} color={look.fg} />
      <AppText variant="label" style={[styles.text, { color: look.fg }]}>
        {text}
      </AppText>
      {action !== undefined && <Button label={action.label} onPress={action.onPress} variant="ghost" />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
});
