import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { VALUE_SCALE } from '@/domain/decimal';
import { formatPercent, formatUnits } from '@/domain/format';
import { holdingsByFund, sortLots, type EvaluatedLot } from '@/domain/holdings';
import type { NavPoint } from '@/domain/types';
import { evaluateLot } from '@/domain/valuation';
import type { HoldingLot } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';

import { LotRow } from '../holdings/LotRow';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';

export interface FundLotsProps {
  schemeCode: number;
  name: string;
  last: NavPoint;
}

/**
 * "Your investment": shown first on the fund page when you hold the fund, because your
 * own numbers matter more than the fund's. Renders nothing when you don't.
 */
export function FundLots({ schemeCode, name, last }: FundLotsProps) {
  const { colors, radius, spacing } = useTheme();
  const lots = usePortfolioStore(useShallow((s) => s.lots.filter((lot) => lot.schemeCode === schemeCode)));
  const removeLot = usePortfolioStore((s) => s.removeLot);
  const hideAmounts = usePreferencesStore((s) => s.hideAmounts);
  const toggleHideAmounts = usePreferencesStore((s) => s.toggleHideAmounts);

  const evaluated = useMemo<(HoldingLot & EvaluatedLot)[]>(
    () => sortLots(lots).map((lot) => ({ ...lot, status: evaluateLot(lot, last) })),
    [lots, last],
  );
  const fund = useMemo(() => holdingsByFund(evaluated)[0], [evaluated]);
  if (fund === undefined) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, paddingTop: spacing.lg },
      ]}
    >
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md }}>
        <View style={styles.header}>
          <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
            Your investment
          </AppText>
          <IconButton
            name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
            onPress={toggleHideAmounts}
            selected={hideAmounts}
            accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
          />
        </View>
        {fund.valuedCount > 0 ? (
          <>
            <PrivateAmount value={fund.current} scale={VALUE_SCALE} variant="figure" />
            <View style={[styles.line, { gap: spacing.sm }]}>
              <SignedAmount value={fund.gain} scale={VALUE_SCALE} variant="label" private />
              {fund.returnHundredths !== null && <SignedPercent hundredths={fund.returnHundredths} variant="label" />}
              {fund.xirrPercent !== null && (
                <AppText
                  variant="label"
                  tone="muted"
                  numeric
                  accessibilityLabel={`XIRR ${formatPercent(fund.xirrPercent)} per year`}
                >
                  · XIRR {formatPercent(fund.xirrPercent)} p.a.
                </AppText>
              )}
            </View>
            <View style={[styles.line, { gap: 4 }]}>
              <AppText variant="caption" tone="muted">
                Invested
              </AppText>
              <PrivateAmount value={fund.invested} scale={VALUE_SCALE} variant="caption" tone="muted" />
              <AppText variant="caption" tone="muted" numeric>
                · {formatUnits(fund.units)} units
              </AppText>
            </View>
          </>
        ) : (
          <AppText tone="muted">Awaiting the NAV for your purchase date.</AppText>
        )}
      </View>
      {evaluated.map((lot) => (
        <LotRow key={lot.id} lot={lot} status={lot.status} onRemove={removeLot} />
      ))}
      <View style={{ padding: spacing.lg, paddingTop: spacing.sm }}>
        <Button
          label="Add another purchase"
          variant="ghost"
          icon="add"
          onPress={() => router.push({ pathname: '/add-holding', params: { code: String(schemeCode), name } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
