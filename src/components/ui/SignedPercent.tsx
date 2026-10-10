import { formatPercentHundredths } from '@/domain/format';
import { changeDirection, spokenChange } from '@/domain/signed';

import { AppText, type TextVariant } from './AppText';

const TONE = { gain: 'gain', loss: 'loss', none: 'muted' } as const;

export interface SignedPercentProps {
  hundredths: bigint;
  variant?: TextVariant;
  /** Rows cap text growth at 1.3 so fixed heights hold at the largest font sizes. */
  maxFontSizeMultiplier?: number;
}

/** "+12.34%" toned by sign, read as "gain of 12.34%". */
export function SignedPercent({ hundredths, variant = 'body', maxFontSizeMultiplier }: SignedPercentProps) {
  const magnitude = formatPercentHundredths(hundredths < 0n ? -hundredths : hundredths, 'negative-only');
  return (
    <AppText
      variant={variant}
      tone={TONE[changeDirection(hundredths)]}
      numeric
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={spokenChange(hundredths, magnitude)}
    >
      {formatPercentHundredths(hundredths)}
    </AppText>
  );
}
