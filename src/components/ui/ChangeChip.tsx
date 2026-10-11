import { View } from 'react-native';

import { rescale } from '@/domain/decimal';
import { formatInr, formatPercentHundredths } from '@/domain/format';
import { changeDirection, spokenChange } from '@/domain/signed';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { FadeOnSwap } from './motion';
import { HIDDEN_AMOUNT, useAmountsHidden } from './PrivateAmount';

export const CHIP_HEIGHT = 28;

export interface ChangeChipProps {
  /** The change in rupees; null to show only the percentage. */
  amount: bigint | null;
  scale: number;
  /** The change in hundredths of a percent; null to show only the amount. */
  pctHundredths: bigint | null;
  /** The user's own money: the rupee part becomes dots while amounts are hidden. */
  private?: boolean;
}

/**
 * A change as a tinted pill: "+₹1,31,214.58 · +23.14%". Green on a green tint for a gain,
 * red on a red tint for a loss, grey for none; the sign is always printed and the label
 * says "gain of" or "loss of", so colour is never the only signal.
 */
export function ChangeChip({ amount, scale, pctHundredths, private: isPrivate = false }: ChangeChipProps) {
  const { colors, radius, spacing } = useTheme();
  const hidden = useAmountsHidden() && isPrivate;
  const paise = amount !== null ? rescale(amount, scale, 2) : null;
  const direction = changeDirection(paise ?? pctHundredths ?? 0n);
  const look = {
    gain: { bg: colors.gainSurface, fg: colors.gain },
    loss: { bg: colors.lossSurface, fg: colors.loss },
    none: { bg: colors.surfaceMuted, fg: colors.textMuted },
  }[direction];

  const parts: string[] = [];
  const spoken: string[] = [];
  if (amount !== null && paise !== null) {
    parts.push(hidden ? HIDDEN_AMOUNT : formatInr(amount, scale, 'always'));
    spoken.push(hidden ? `${direction === 'none' ? 'no change' : direction}, amount hidden` : spokenChange(paise, formatInr(amount < 0n ? -amount : amount, scale)));
  }
  if (pctHundredths !== null) {
    parts.push(formatPercentHundredths(pctHundredths));
    const magnitude = formatPercentHundredths(pctHundredths < 0n ? -pctHundredths : pctHundredths, 'negative-only');
    spoken.push(amount !== null ? `${pctHundredths < 0n ? 'down' : pctHundredths > 0n ? 'up' : 'unchanged'} ${magnitude}` : spokenChange(pctHundredths, magnitude));
  }

  const chip = (
    <View
      accessible
      accessibilityLabel={spoken.join(', ')}
      style={{
        alignSelf: 'flex-start',
        minHeight: CHIP_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: look.bg,
      }}
    >
      <AppText variant="labelStrong" numeric maxFontSizeMultiplier={1.3} style={{ color: look.fg }}>
        {parts.join(' · ')}
      </AppText>
    </View>
  );
  return isPrivate ? <FadeOnSwap swapKey={hidden ? 'hidden' : 'shown'}>{chip}</FadeOnSwap> : chip;
}

/** A status in the same pill shape: "Stale · 01 Jun 2018". The words carry the meaning. */
export function StatusChip({ label }: { label: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        minHeight: 24,
        justifyContent: 'center',
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radius.pill,
        backgroundColor: colors.warningSurface,
      }}
    >
      <AppText variant="caption" numeric maxFontSizeMultiplier={1.3} style={{ color: colors.warning, fontFamily: fonts.semibold }}>
        {label}
      </AppText>
    </View>
  );
}
