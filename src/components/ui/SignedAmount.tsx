import { rescale } from '@/domain/decimal';
import { formatInr } from '@/domain/format';
import { changeDirection, spokenChange } from '@/domain/signed';

import { AppText, type TextVariant } from './AppText';
import { FadeOnSwap } from './motion';
import { HIDDEN_AMOUNT, useAmountsHidden } from './PrivateAmount';

const TONE = { gain: 'gain', loss: 'loss', none: 'muted' } as const;

export interface SignedAmountProps {
  value: bigint;
  scale: number;
  variant?: TextVariant;
  /** Rows cap text growth at 1.3 so fixed heights hold at the largest font sizes. */
  maxFontSizeMultiplier?: number;
  /** The user's own money: shown as dots while amounts are hidden (the eye toggle). */
  private?: boolean;
}

/** "+₹1,763.24" in the gain colour, read as "gain of ₹1,763.24". The sign is judged after rounding to the paisa. */
export function SignedAmount({
  value,
  scale,
  variant = 'body',
  maxFontSizeMultiplier,
  private: isPrivate = false,
}: SignedAmountProps) {
  const hidden = useAmountsHidden() && isPrivate;
  const paise = rescale(value, scale, 2);
  const magnitude = formatInr(value < 0n ? -value : value, scale);
  const direction = changeDirection(paise);
  const label = hidden ? `${direction === 'none' ? 'no change' : direction}, amount hidden` : spokenChange(paise, magnitude);
  const text = (
    <AppText
      variant={variant}
      tone={TONE[direction]}
      numeric
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={label}
    >
      {hidden ? HIDDEN_AMOUNT : formatInr(value, scale, 'always')}
    </AppText>
  );
  // Only the user's own money swaps with the eye toggle, so only it fades.
  return isPrivate ? <FadeOnSwap swapKey={hidden ? 'hidden' : 'shown'}>{text}</FadeOnSwap> : text;
}

