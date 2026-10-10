import { memo, useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { UNITS_SCALE, VALUE_SCALE, parseScaled } from '@/domain/decimal';
import { formatNav, formatUnits } from '@/domain/format';
import type { LotStatus } from '@/domain/valuation';
import type { HoldingLot } from '@/store/portfolioSchema';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { SwipeRow } from '../ui/SwipeRow';

/** Units as stored ("125.432") shown with Indian grouping. */
export function lotUnitsText(units: string): string {
  const scaled = parseScaled(units, UNITS_SCALE);
  return scaled !== null ? formatUnits(scaled) : units;
}

export interface LotRowProps {
  lot: HoldingLot;
  status: LotStatus;
  onRemove: (id: string) => void;
}

/**
 * One purchase on the fund page: when, how many units, at which NAV, and what it's
 * worth now. Swipe left to remove, after a confirmation.
 */
export const LotRow = memo(function LotRow({ lot, status, onRemove }: LotRowProps) {
  const { colors, spacing } = useTheme();
  const { applied } = lot;

  const confirm = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        Alert.alert(
          'Remove this purchase?',
          `${lotUnitsText(lot.units)} units bought ${formatDate(lot.purchaseDate)}. This can't be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                onRemove(lot.id);
                resolve(true);
              },
            },
          ],
        );
      }),
    [lot, onRemove],
  );

  return (
    <SwipeRow actionLabel="Remove" onAction={confirm}>
      <View
        style={[
          styles.row,
          { borderTopColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, gap: 2 },
        ]}
      >
        <View style={[styles.line, { gap: spacing.md }]}>
          <AppText variant="label" numeric style={styles.flex}>
            {formatDate(lot.purchaseDate)}
          </AppText>
          {status.status === 'valued' ? (
            <PrivateAmount value={status.valuation.current} scale={VALUE_SCALE} variant="label" />
          ) : status.status === 'pending' ? (
            <Badge label="Awaiting NAV" tone="warning" />
          ) : null}
        </View>
        <View style={[styles.line, { gap: spacing.md }]}>
          <AppText variant="caption" tone="muted" numeric style={styles.flex}>
            {lotUnitsText(lot.units)} units
            {applied !== null ? ` at ${formatNav(applied.nav)}` : ''}
            {applied !== null && applied.navDate !== lot.purchaseDate ? ` (NAV of ${formatDate(applied.navDate)})` : ''}
          </AppText>
          {status.status === 'valued' && (
            <SignedPercent hundredths={status.valuation.returnHundredths} variant="caption" />
          )}
        </View>
      </View>
    </SwipeRow>
  );
});

const styles = StyleSheet.create({
  row: { borderTopWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
