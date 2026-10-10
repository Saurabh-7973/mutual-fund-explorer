import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent, formatUnits } from '@/domain/format';
import type { FundHolding } from '@/domain/holdings';
import { describeScheme } from '@/domain/schemeName';
import { useTheme } from '@/theme/useTheme';

import { SchemeBadges } from '../search/SchemeBadges';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { SwipeRow } from '../ui/SwipeRow';

export const FUND_HOLDING_ROW_HEIGHT = 112;

export type FundRowNav = 'ready' | 'loading' | 'failed';

export interface FundHoldingRowProps {
  fund: FundHolding;
  nav: FundRowNav;
  onRetry: (schemeCode: number) => void;
  /** Resolves true when the user confirmed and the lots were removed. */
  onRemove: (fund: FundHolding) => Promise<boolean>;
}

/**
 * One fund in the portfolio: value and return on the right, what you hold on the left.
 * Tap for the fund and its purchases; swipe left to remove all of them.
 */
export const FundHoldingRow = memo(function FundHoldingRow({ fund, nav, onRetry, onRemove }: FundHoldingRowProps) {
  const { colors, spacing } = useTheme();
  const title = useMemo(() => describeScheme(fund.schemeName).title, [fund.schemeName]);
  const remove = useCallback(() => onRemove(fund), [onRemove, fund]);
  const purchases = `${fund.lotCount} ${fund.lotCount === 1 ? 'purchase' : 'purchases'}`;

  let value = null;
  let gain = null;
  let ret = null;
  if (fund.valuedCount > 0) {
    value = (
      <AppText variant="heading" numeric maxFontSizeMultiplier={1.3}>
        {formatInr(fund.current, VALUE_SCALE)}
      </AppText>
    );
    gain = (
      <View style={[styles.line, { gap: spacing.xs }]}>
        <SignedAmount value={fund.gain} scale={VALUE_SCALE} variant="label" maxFontSizeMultiplier={1.3} />
        {fund.returnHundredths !== null && (
          <SignedPercent hundredths={fund.returnHundredths} variant="label" maxFontSizeMultiplier={1.3} />
        )}
      </View>
    );
    ret =
      fund.xirrPercent !== null ? (
        <AppText
          variant="caption"
          tone="muted"
          numeric
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={`XIRR ${formatPercent(fund.xirrPercent)} per year`}
        >
          XIRR {formatPercent(fund.xirrPercent)} p.a.
        </AppText>
      ) : null;
  } else if (nav === 'loading') {
    value = <Skeleton width={96} height={18} />;
    gain = <Skeleton width={110} height={14} />;
  } else if (nav === 'failed') {
    value = (
      <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
        Couldn't load latest NAV
      </AppText>
    );
    gain = (
      <Pressable
        onPress={() => onRetry(fund.schemeCode)}
        accessibilityRole="button"
        accessibilityLabel={`Retry loading the latest NAV for ${title}`}
        hitSlop={12}
      >
        <AppText variant="label" tone="primary" maxFontSizeMultiplier={1.3}>
          Retry
        </AppText>
      </Pressable>
    );
  } else {
    value = <Badge label="Awaiting NAV" tone="warning" />;
  }

  const waiting =
    fund.pendingCount > 0 ? `${fund.pendingCount} awaiting NAV` : fund.unavailableCount > 0 && fund.valuedCount > 0
      ? `${fund.unavailableCount} not loaded`
      : null;

  return (
    <SwipeRow actionLabel="Remove" onAction={remove}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund and its purchases. Swipe left to remove."
        onPress={() =>
          router.push({ pathname: '/fund/[code]', params: { code: String(fund.schemeCode), name: fund.schemeName } })
        }
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
            gap: spacing.xs,
            backgroundColor: pressed ? colors.surfaceMuted : colors.background,
          },
        ]}
      >
        <View style={[styles.line, { gap: spacing.md }]}>
          <AppText variant="label" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </AppText>
          {value}
        </View>
        <View style={[styles.line, styles.minLine, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <SchemeBadges name={fund.schemeName} size="sm" />
          </View>
          {gain}
        </View>
        <View style={[styles.line, styles.minLine, { gap: spacing.md }]}>
          <AppText variant="caption" numeric numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
            {formatUnits(fund.units)} units · {purchases}
          </AppText>
          {ret}
        </View>
        <View style={[styles.line, styles.minLine, { gap: spacing.md }]}>
          <AppText variant="caption" tone="warning" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.flex}>
            {waiting ?? ''}
          </AppText>
          {fund.latestDate !== null && (
            <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
              as of {formatDate(fund.latestDate)}
            </AppText>
          )}
        </View>
      </Pressable>
    </SwipeRow>
  );
});

const styles = StyleSheet.create({
  row: {
    height: FUND_HOLDING_ROW_HEIGHT,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  line: { flexDirection: 'row', alignItems: 'center' },
  minLine: { minHeight: 18 },
  title: { flex: 1, fontWeight: '600' },
  flex: { flex: 1 },
});
