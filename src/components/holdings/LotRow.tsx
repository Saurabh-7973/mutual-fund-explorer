import { router } from 'expo-router';
import { memo, useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { UNITS_SCALE, VALUE_SCALE, parseScaled } from '@/domain/decimal';
import { formatInr, formatNav, formatPercent, formatUnits } from '@/domain/format';
import { describeScheme } from '@/domain/schemeName';
import type { LotValuation } from '@/domain/valuation';
import type { HoldingLot } from '@/store/portfolioSchema';
import { useTheme } from '@/theme/useTheme';

import { SchemeBadges } from '../search/SchemeBadges';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { Skeleton } from '../ui/Skeleton';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';

export const LOT_ROW_HEIGHT = 148;

/** What the row can show on the right: the latest NAV is loading, failed, or the lot is valued or awaiting its NAV. */
export type LotRowState =
  | { kind: 'pending' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'valued'; valuation: LotValuation };

export interface LotRowProps {
  lot: HoldingLot;
  state: LotRowState;
  onRetry: (schemeCode: number) => void;
  onRemove: (lot: HoldingLot) => void;
}

/** Units as stored ("125.432") shown with Indian grouping. */
export function lotUnitsText(units: string): string {
  const scaled = parseScaled(units, UNITS_SCALE);
  return scaled !== null ? formatUnits(scaled) : units;
}

export const LotRow = memo(function LotRow({ lot, state, onRetry, onRemove }: LotRowProps) {
  const { colors, spacing } = useTheme();
  const title = useMemo(() => describeScheme(lot.schemeName).title, [lot.schemeName]);
  const { applied } = lot;

  // Four lines, each split left | right, so the columns line up and the row never outgrows its height.
  const right: [ReactNode, ReactNode, ReactNode, ReactNode] = [null, null, null, null];
  switch (state.kind) {
    case 'pending':
      right[0] = <Badge label="Awaiting NAV" tone="warning" />;
      right[1] = (
        <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
          for {formatDate(lot.purchaseDate)}
        </AppText>
      );
      break;
    case 'loading':
      right[0] = <Skeleton width={96} height={18} />;
      right[1] = <Skeleton width={72} height={14} />;
      right[2] = <Skeleton width={64} height={14} />;
      break;
    case 'failed':
      right[0] = (
        <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3}>
          Couldn't load latest NAV
        </AppText>
      );
      right[1] = (
        <Pressable
          onPress={() => onRetry(lot.schemeCode)}
          accessibilityRole="button"
          accessibilityLabel={`Retry loading the latest NAV for ${title}`}
          hitSlop={12}
        >
          <AppText variant="label" tone="primary" maxFontSizeMultiplier={1.3}>
            Retry
          </AppText>
        </Pressable>
      );
      break;
    case 'valued': {
      const { valuation } = state;
      right[0] = (
        <AppText variant="heading" numeric maxFontSizeMultiplier={1.3}>
          {formatInr(valuation.current, VALUE_SCALE)}
        </AppText>
      );
      right[1] = <SignedAmount value={valuation.gain} scale={VALUE_SCALE} variant="label" maxFontSizeMultiplier={1.3} />;
      right[2] = (
        <View style={[styles.line, { gap: spacing.xs }]}>
          <SignedPercent hundredths={valuation.returnHundredths} variant="caption" maxFontSizeMultiplier={1.3} />
          {valuation.cagrPercent !== null && (
            <AppText
              variant="caption"
              tone="muted"
              numeric
              maxFontSizeMultiplier={1.3}
              accessibilityLabel={`${formatPercent(valuation.cagrPercent)} per year`}
            >
              · {formatPercent(valuation.cagrPercent)} p.a.
            </AppText>
          )}
        </View>
      );
      right[3] = (
        <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
          as of {formatDate(valuation.latestDate)}
        </AppText>
      );
      break;
    }
  }

  const left: [ReactNode, ReactNode, ReactNode, ReactNode] = [
    <AppText key="t" variant="label" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>
      {title}
    </AppText>,
    <SchemeBadges key="b" name={lot.schemeName} size="sm" />,
    <AppText key="u" variant="caption" numeric numberOfLines={1} maxFontSizeMultiplier={1.3}>
      {lotUnitsText(lot.units)} units · bought {formatDate(lot.purchaseDate)}
    </AppText>,
    applied !== null ? (
      <AppText key="n" variant="caption" tone="muted" numeric numberOfLines={2} maxFontSizeMultiplier={1.3}>
        NAV {formatNav(applied.nav)} of {formatDate(applied.navDate)}
        {applied.navDate !== lot.purchaseDate ? ' (next NAV after the purchase date)' : ''}
      </AppText>
    ) : null,
  ];

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, paddingLeft: spacing.lg, paddingRight: spacing.sm, gap: spacing.sm },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund"
        onPress={() =>
          router.push({ pathname: '/fund/[code]', params: { code: String(lot.schemeCode), name: lot.schemeName } })
        }
        style={({ pressed }) => [styles.main, { gap: spacing.xs, opacity: pressed ? 0.6 : 1 }]}
      >
        {left.map((cell, i) => (
          <View key={i} style={[styles.line, { gap: spacing.md }]}>
            <View style={styles.flex}>{cell}</View>
            {right[i]}
          </View>
        ))}
      </Pressable>
      <IconButton
        name="trash-outline"
        onPress={() => onRemove(lot)}
        accessibilityLabel={`Remove holding: ${title}, bought ${formatDate(lot.purchaseDate)}`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: LOT_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  main: { flex: 1, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  title: { fontWeight: '600' },
});
