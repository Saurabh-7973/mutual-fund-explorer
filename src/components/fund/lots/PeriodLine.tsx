import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatUnits } from '@/domain/format';
import { lockInEndsOn, type UnitsUntil } from '@/domain/holdingPeriod';
import type { IsoDate } from '@/domain/types';
import { unitsValue } from '@/domain/valuation';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../../ui/AppText';
import { PrivateAmount } from '../../ui/PrivateAmount';
import { Term } from '../../ui/Term';

/** An ELSS purchase's lock-in end date, from its allotment (NAV) date, while it's still ahead. */
export function stillLocked(allotted: IsoDate, today: IsoDate): IsoDate | null {
  const end = lockInEndsOn(allotted);
  return end > today ? end : null;
}

/**
 * "In lock-in ⓘ  1,390.3029 of 1,766.5700 units", then "Next unlocks 05 Nov 2026 · all free
 * by 05 Oct 2029": how much is waiting, then when it starts and finishes.
 */
export function PeriodLine({
  icon,
  term,
  label,
  until,
  total,
  nav,
  next,
  all,
}: {
  icon: 'lock-closed-outline' | 'time-outline';
  term: 'lockIn' | 'longTerm';
  label: string;
  until: UnitsUntil;
  total: bigint;
  /** Today's NAV: the line shows what the waiting units are worth, as Groww splits long and short term in rupees. */
  nav: string;
  next: string;
  all: string;
}) {
  const { colors, spacing } = useTheme();
  const waitingValue = unitsValue(until.units, nav);
  const totalValue = unitsValue(total, nav);
  return (
    <View style={[styles.periodRow, { gap: spacing.sm }]}>
      <Ionicons name={icon} size={14} color={colors.textMuted} style={styles.periodIcon} />
      <View style={[styles.flex, { gap: 2 }]}>
        <View style={[styles.line, { columnGap: spacing.sm }]}>
          <Term term={term} label={label} variant="caption" />
          {waitingValue !== null && totalValue !== null ? (
            <View style={[styles.line, { columnGap: 4 }]}>
              <PrivateAmount value={waitingValue} scale={VALUE_SCALE} variant="caption" />
              <AppText variant="caption" tone="muted">
                of
              </AppText>
              <PrivateAmount value={totalValue} scale={VALUE_SCALE} variant="caption" tone="muted" />
            </View>
          ) : (
            <AppText variant="caption" numeric>
              {formatUnits(until.units)} of {formatUnits(total)} units
            </AppText>
          )}
        </View>
        <AppText variant="caption" tone="muted" numeric>
          {next} {formatDate(until.next)}
          {until.all !== until.next ? ` · ${all} ${formatDate(until.all)}` : ''}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  periodRow: { flexDirection: 'row', alignItems: 'flex-start' },
  periodIcon: { marginTop: 2 },
});
