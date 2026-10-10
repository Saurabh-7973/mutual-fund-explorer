import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { formatDate } from '@/domain/dates';
import { UNITS_SCALE, VALUE_SCALE, parseScaled } from '@/domain/decimal';
import { formatInr, formatNav, formatUnits } from '@/domain/format';
import type { NavPoint } from '@/domain/types';
import { evaluateLot } from '@/domain/valuation';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';

export interface FundLotsProps {
  schemeCode: number;
  name: string;
  last: NavPoint;
}

/** The user's purchases of this fund. Renders nothing when there are none. */
export function FundLots({ schemeCode, name, last }: FundLotsProps) {
  const { colors, spacing } = useTheme();
  const lots = usePortfolioStore(useShallow((s) => s.lots.filter((lot) => lot.schemeCode === schemeCode)));
  if (lots.length === 0) return null;

  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header">
        Your holdings in this fund
      </AppText>
      {lots.map((lot) => {
        const units = parseScaled(lot.units, UNITS_SCALE);
        const status = evaluateLot(lot, last);
        return (
          <View
            key={lot.id}
            style={[styles.lot, { borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.xs }]}
          >
            <AppText variant="label" numeric>
              {units !== null ? formatUnits(units) : lot.units} units · bought {formatDate(lot.purchaseDate)}
            </AppText>
            {lot.applied !== null ? (
              <AppText variant="caption" tone="muted" numeric>
                NAV {formatNav(lot.applied.nav)} of {formatDate(lot.applied.navDate)}
              </AppText>
            ) : (
              <Badge label="Awaiting NAV" tone="warning" />
            )}
            {status.status === 'valued' && (
              <View style={[styles.value, { gap: spacing.sm }]}>
                <AppText numeric>{formatInr(status.valuation.current, VALUE_SCALE)}</AppText>
                <SignedAmount value={status.valuation.gain} scale={VALUE_SCALE} />
                <SignedPercent hundredths={status.valuation.returnHundredths} />
                <AppText variant="caption" tone="muted">
                  as of {formatDate(status.valuation.latestDate)}
                </AppText>
              </View>
            )}
          </View>
        );
      })}
      <Button
        label="Add another purchase"
        variant="secondary"
        icon="add"
        onPress={() => router.push({ pathname: '/add-holding', params: { code: String(schemeCode), name } })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  lot: { borderTopWidth: StyleSheet.hairlineWidth },
  value: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
