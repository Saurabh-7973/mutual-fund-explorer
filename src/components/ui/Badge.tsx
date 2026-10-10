import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'gain' | 'loss';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** A small pill. The label carries the meaning; colour only reinforces it. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors, radius, spacing } = useTheme();
  const palette = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
    info: { bg: colors.infoSurface, fg: colors.info },
    warning: { bg: colors.warningSurface, fg: colors.warning },
    gain: { bg: colors.surfaceMuted, fg: colors.gain },
    loss: { bg: colors.surfaceMuted, fg: colors.loss },
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.bg,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <AppText variant="caption" maxFontSizeMultiplier={1.3} style={{ color: palette.fg, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}
