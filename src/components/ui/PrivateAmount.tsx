import { formatInr, formatInrCompact } from '@/domain/format';
import { usePreferencesStore } from '@/store/preferencesStore';

import { AppText, type AppTextProps } from './AppText';
import { FadeOnSwap } from './motion';

/** What a hidden amount looks like: fixed width, so hiding doesn't reflow the layout much. */
export const HIDDEN_AMOUNT = '•••••';

/** True when the user has hidden their rupee amounts with the eye toggle. */
export function useAmountsHidden(): boolean {
  return usePreferencesStore((s) => s.hideAmounts);
}

export interface PrivateAmountProps extends Omit<AppTextProps, 'children'> {
  value: bigint;
  scale: number;
  /** "₹4.08 L" from a lakh up (dense places); screen readers still hear the exact amount. */
  compact?: boolean;
}

/** One of the user's own rupee amounts, replaced by dots while amounts are hidden. Percentages are never hidden. */
export function PrivateAmount({ value, scale, compact = false, accessibilityLabel, ...rest }: PrivateAmountProps) {
  const hidden = useAmountsHidden();
  const exact = formatInr(value, scale);
  return (
    <FadeOnSwap swapKey={hidden ? 'hidden' : 'shown'}>
      <AppText numeric accessibilityLabel={hidden ? 'Amount hidden' : (accessibilityLabel ?? (compact ? exact : undefined))} {...rest}>
        {hidden ? HIDDEN_AMOUNT : compact ? formatInrCompact(value, scale) : exact}
      </AppText>
    </FadeOnSwap>
  );
}
