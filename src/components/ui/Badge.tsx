import { View } from 'react-native';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export const BADGE_HEIGHT = 20;

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
        // A fixed height, so a tag sits on the same baseline grid as the text beside it.
        height: BADGE_HEIGHT,
        justifyContent: 'center',
        backgroundColor: palette.bg,
        borderRadius: radius.xs,
        paddingHorizontal: spacing.xs + 2,
      }}
    >
      <AppText
        variant="caption"
        maxFontSizeMultiplier={1.2}
        style={{ color: palette.fg, fontFamily: fonts.semibold, lineHeight: 16 }}
      >
        {label}
      </AppText>
    </View>
  );
}
