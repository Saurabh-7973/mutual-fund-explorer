import { Text } from 'react-native';

import { formatInr } from '@/domain/format';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { FadeOnSwap } from './motion';
import { HIDDEN_AMOUNT, useAmountsHidden } from './PrivateAmount';

/** "−₹6,98,214.58" → sign, rupees and paise, so the rupees can be set large and the rest small. */
function splitAmount(formatted: string): { sign: string; rupees: string; paise: string } | null {
  const match = /^([−-]?)₹([\d,]+)(\.\d+)?$/.exec(formatted);
  if (match === null) return null;
  return { sign: match[1] ?? '', rupees: match[2] ?? '', paise: match[3] ?? '' };
}

/**
 * The one rupee amount a screen is about, typeset like a price: the ₹ and the paise smaller,
 * the paise in the secondary colour, so the eye lands on the rupees. Read whole by screen
 * readers; dots while amounts are hidden.
 */
export function MoneyHero({
  value,
  scale,
  private: isPrivate = true,
}: {
  value: bigint;
  scale: number;
  /** Your own money (the default) hides with the eye; a hypothetical amount stays visible. */
  private?: boolean;
}) {
  const { colors } = useTheme();
  const hidden = useAmountsHidden() && isPrivate;
  const formatted = formatInr(value, scale);
  const parts = splitAmount(formatted);
  return (
    <FadeOnSwap swapKey={hidden ? 'hidden' : 'shown'}>
      <AppText
        variant="money"
        numeric
        maxFontSizeMultiplier={1.2}
        accessibilityLabel={hidden ? 'Amount hidden' : formatted}
      >
        {hidden || parts === null ? (
          hidden ? HIDDEN_AMOUNT : formatted
        ) : (
          <>
            <Text style={{ fontSize: 26, fontFamily: fonts.semibold, letterSpacing: 0 }}>
              {parts.sign}₹
            </Text>
            {parts.rupees}
            <Text style={{ fontSize: 24, fontFamily: fonts.semibold, letterSpacing: -0.4, color: colors.textMuted }}>
              {parts.paise}
            </Text>
          </>
        )}
      </AppText>
    </FadeOnSwap>
  );
}
