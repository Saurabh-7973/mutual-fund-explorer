import { Text, type TextProps } from 'react-native';

import { tabularNumbers, type typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TextVariant = keyof typeof typography;
export type TextTone = 'default' | 'muted' | 'primary' | 'gain' | 'loss' | 'warning' | 'danger';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Same-width digits, so figures line up in columns. */
  numeric?: boolean;
}

/** Text with a typography token and a theme colour. Rows pass `maxFontSizeMultiplier={1.3}`. */
export function AppText({ variant = 'body', tone = 'default', numeric = false, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    gain: colors.gain,
    loss: colors.loss,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];
  return <Text style={[typography[variant], { color }, numeric && tabularNumbers, style]} {...rest} />;
}
