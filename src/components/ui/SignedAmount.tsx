import { rescale } from '@/domain/decimal';
import { formatInr } from '@/domain/format';
import { changeDirection, spokenChange } from '@/domain/signed';

import { AppText, type TextVariant } from './AppText';

const TONE = { gain: 'gain', loss: 'loss', none: 'muted' } as const;

export interface SignedAmountProps {
  value: bigint;
  scale: number;
  variant?: TextVariant;
  /** Rows cap text growth at 1.3 so fixed heights hold at the largest font sizes. */
  maxFontSizeMultiplier?: number;
}

/** "+₹1,763.24" in the gain colour, read as "gain of ₹1,763.24". The sign is judged after rounding to the paisa. */
export function SignedAmount({ value, scale, variant = 'body', maxFontSizeMultiplier }: SignedAmountProps) {
  const paise = rescale(value, scale, 2);
  const magnitude = formatInr(value < 0n ? -value : value, scale);
  return (
    <AppText
      variant={variant}
      tone={TONE[changeDirection(paise)]}
      numeric
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={spokenChange(paise, magnitude)}
    >
      {formatInr(value, scale, 'always')}
    </AppText>
  );
}

