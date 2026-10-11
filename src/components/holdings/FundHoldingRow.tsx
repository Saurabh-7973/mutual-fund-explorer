import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent } from '@/domain/format';
import type { DayGain, FundHolding } from '@/domain/holdings';
import { describeScheme } from '@/domain/schemeName';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { PrivateAmount } from '../ui/PrivateAmount';
import { Skeleton } from '../ui/Skeleton';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { SwipeRow } from '../ui/SwipeRow';

// Whole device pixels: at 2.625x, 76 dp is a fractional pixel height, so every other row overlapped
// the one above by a pixel and hid its hairline divider.
export const FUND_HOLDING_ROW_HEIGHT = PixelRatio.roundToNearestPixel(76);

/** What the right-hand column shows; one at a time keeps rows quiet (switched above the list). */
export type HoldingColumn = 'value' | 'returns' | 'day' | 'xirr';

export const HOLDING_COLUMNS = [
  { key: 'value', label: 'Current (invested)' },
  { key: 'returns', label: 'Returns (%)' },
  { key: 'day', label: 'Day change (%)' },
  { key: 'xirr', label: 'XIRR' },
] as const satisfies readonly { key: HoldingColumn; label: string }[];

export type FundRowNav = 'ready' | 'loading' | 'failed';

export interface FundHoldingRowProps {
  fund: FundHolding;
  nav: FundRowNav;
  column: HoldingColumn;
  /** Today's change in this fund's value, or null until two recent NAVs are loaded. */
  dayGain: DayGain | null;
  /** A running SIP's monthly amount in whole rupees, shown instead of the purchase count. */
  sipRupees: number | null;
  onRetry: (schemeCode: number) => void;
  /** Resolves true when the user confirmed and the lots were removed. */
  onRemove: (fund: FundHolding) => Promise<boolean>;
}

/**
 * One fund in the portfolio, kept to two lines: the fund and what you hold on the left,
 * one chosen figure on the right. Tap for the fund page and its purchases; swipe to remove.
 */
export const FundHoldingRow = memo(function FundHoldingRow({
  fund,
  nav,
  column,
  dayGain,
  sipRupees,
  onRetry,
  onRemove,
}: FundHoldingRowProps) {
  const { colors, spacing } = useTheme();
  const label = useMemo(() => describeScheme(fund.schemeName), [fund.schemeName]);
  const remove = useCallback(() => onRemove(fund), [onRemove, fund]);

  const held =
    sipRupees !== null
      ? `SIP ${formatInr(BigInt(sipRupees) * 100n, 2).replace(/\.00$/, '')}`
      : `${fund.lotCount} ${fund.lotCount === 1 ? 'purchase' : 'purchases'}`;
  const meta = [label.plan, label.option, held]
    .filter((part): part is string => part !== null)
    .join(' · ');
  const waiting = fund.pendingCount > 0 ? `${fund.pendingCount} awaiting NAV` : null;

  let primary;
  let secondary = null;
  if (fund.valuedCount === 0 && nav === 'loading') {
    primary = <Skeleton width={96} height={18} />;
    secondary = <Skeleton width={72} height={12} />;
  } else if (fund.valuedCount === 0 && nav === 'failed') {
    primary = (
      <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
        Couldn't load NAV
      </AppText>
    );
    secondary = (
      <Pressable
        onPress={() => onRetry(fund.schemeCode)}
        accessibilityRole="button"
        accessibilityLabel={`Retry loading the NAV for ${label.title}`}
        hitSlop={12}
      >
        <AppText variant="label" tone="primary" maxFontSizeMultiplier={1.3}>
          Retry
        </AppText>
      </Pressable>
    );
  } else if (fund.valuedCount === 0) {
    primary = (
      <AppText variant="label" tone="warning" maxFontSizeMultiplier={1.3}>
        Awaiting NAV
      </AppText>
    );
  } else if (column === 'value') {
    primary = (
      <PrivateAmount value={fund.current} scale={VALUE_SCALE} variant="heading" maxFontSizeMultiplier={1.3} />
    );
    secondary = (
      <View style={styles.line}>
        <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
          (
        </AppText>
        <PrivateAmount value={fund.invested} scale={VALUE_SCALE} variant="caption" tone="muted" maxFontSizeMultiplier={1.3} />
        <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
          )
        </AppText>
      </View>
    );
  } else if (column === 'returns') {
    primary = (
      <SignedAmount value={fund.gain} scale={VALUE_SCALE} variant="heading" maxFontSizeMultiplier={1.3} private />
    );
    secondary =
      fund.returnHundredths !== null ? (
        <SignedPercent hundredths={fund.returnHundredths} variant="caption" maxFontSizeMultiplier={1.3} />
      ) : null;
  } else if (column === 'day') {
    primary =
      dayGain !== null ? (
        <SignedAmount value={dayGain.amount} scale={VALUE_SCALE} variant="heading" maxFontSizeMultiplier={1.3} private />
      ) : (
        <AppText variant="heading" tone="muted" maxFontSizeMultiplier={1.3}>
          —
        </AppText>
      );
    secondary =
      dayGain !== null ? (
        <SignedPercent hundredths={dayGain.pctHundredths} variant="caption" maxFontSizeMultiplier={1.3} />
      ) : null;
  } else {
    primary =
      fund.xirrPercent !== null ? (
        <AppText
          variant="heading"
          numeric
          maxFontSizeMultiplier={1.3}
          tone={fund.xirrPercent > 0 ? 'gain' : fund.xirrPercent < 0 ? 'loss' : 'muted'}
          accessibilityLabel={`XIRR ${formatPercent(fund.xirrPercent)} per year`}
        >
          {formatPercent(fund.xirrPercent)}
        </AppText>
      ) : (
        <AppText variant="heading" tone="muted" maxFontSizeMultiplier={1.3}>
          —
        </AppText>
      );
    secondary = (
      <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
        {fund.xirrPercent !== null ? 'a year' : 'after 1 year'}
      </AppText>
    );
  }

  return (
    <SwipeRow actionLabel="Remove" onAction={remove}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund and your purchases. Swipe left to remove."
        onPress={() =>
          router.push({ pathname: '/fund/[code]', params: { code: String(fund.schemeCode), name: fund.schemeName } })
        }
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
            backgroundColor: pressed ? colors.surfaceMuted : colors.background,
          },
        ]}
      >
        <View style={[styles.flex, { gap: 2 }]}>
          <AppText variant="labelStrong" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {label.title}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {meta}
            {waiting !== null && (
              <AppText variant="caption" tone="warning" maxFontSizeMultiplier={1.3}>
                {` · ${waiting}`}
              </AppText>
            )}
          </AppText>
        </View>
        <View style={[styles.right, { gap: 2 }]}>
          {primary}
          {secondary}
        </View>
      </Pressable>
    </SwipeRow>
  );
});

const styles = StyleSheet.create({
  row: {
    height: FUND_HOLDING_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  line: { flexDirection: 'row' },
});
