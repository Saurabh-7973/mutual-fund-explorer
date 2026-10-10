import { router } from 'expo-router';
import { memo, useMemo } from 'react';
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

export const LOT_ROW_HEIGHT = 132;

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

  let right;
  switch (state.kind) {
    case 'pending':
      right = (
        <>
          <Badge label="Awaiting NAV" tone="warning" />
          <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
            for {formatDate(lot.purchaseDate)}
          </AppText>
        </>
      );
      break;
    case 'loading':
      right = (
        <>
          <Skeleton width={96} height={18} />
          <Skeleton width={72} height={14} />
          <Skeleton width={64} height={14} />
        </>
      );
      break;
    case 'failed':
      right = (
        <>
          <AppText variant="caption" tone="danger" maxFontSizeMultiplier={1.3} style={styles.end}>
            Couldn't load latest NAV
          </AppText>
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
        </>
      );
      break;
    case 'valued': {
      const { valuation } = state;
      right = (
        <>
          <AppText variant="heading" numeric maxFontSizeMultiplier={1.3}>
            {formatInr(valuation.current, VALUE_SCALE)}
          </AppText>
          <SignedAmount value={valuation.gain} scale={VALUE_SCALE} variant="label" />
          <View style={[styles.inline, { gap: spacing.xs }]}>
            <SignedPercent hundredths={valuation.returnHundredths} variant="caption" />
            {valuation.cagrPercent !== null && (
              <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
                · {formatPercent(valuation.cagrPercent)} p.a.
              </AppText>
            )}
          </View>
          <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
            as of {formatDate(valuation.latestDate)}
          </AppText>
        </>
      );
      break;
    }
  }

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
        style={({ pressed }) => [styles.main, { gap: spacing.md, opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={[styles.left, { gap: spacing.xs }]}>
          <AppText variant="label" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </AppText>
          <SchemeBadges name={lot.schemeName} size="sm" />
          <AppText variant="caption" numeric numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {lotUnitsText(lot.units)} units · bought {formatDate(lot.purchaseDate)}
          </AppText>
          {applied !== null && (
            <AppText variant="caption" tone="muted" numeric numberOfLines={2} maxFontSizeMultiplier={1.3}>
              NAV {formatNav(applied.nav)} of {formatDate(applied.navDate)}
              {applied.navDate !== lot.purchaseDate ? ' (next NAV after the purchase date)' : ''}
            </AppText>
          )}
        </View>
        <View style={[styles.right, { gap: 2 }]}>{right}</View>
      </Pressable>
      <IconButton name="trash-outline" onPress={() => onRemove(lot)} accessibilityLabel={`Remove holding: ${title}, bought ${formatDate(lot.purchaseDate)}`}
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
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  left: { flex: 1 },
  right: { alignItems: 'flex-end', maxWidth: '48%' },
  title: { fontWeight: '600' },
  inline: { flexDirection: 'row', alignItems: 'baseline' },
  end: { textAlign: 'right' },
});
