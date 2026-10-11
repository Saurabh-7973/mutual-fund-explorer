import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { NAV_SCALE, VALUE_SCALE, toPlainString } from '@/domain/decimal';
import { formatNav, formatUnits } from '@/domain/format';
import type { TimelineEntry } from '@/domain/holdings';
import type { IsoDate, NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../../ui/AppText';
import { PrivateAmount } from '../../ui/PrivateAmount';
import { SwipeRow } from '../../ui/SwipeRow';
import { Term } from '../../ui/Term';
import { haptic } from '../../ui/haptics';

export const navText = (scaled: bigint) => formatNav(toPlainString(scaled, NAV_SCALE));

/** Timeline dot, and its offset so it centres on a row's first line (8 pt padding + half an 18 pt line). */
const DOT_SIZE = 12;
const DOT_TOP = 8 + 9 - DOT_SIZE / 2;

/**
 * The spine and its dot, drawn the same for every event so the eye follows one line down.
 * The dot sits beside the event's first line (its date), not the middle of its block.
 */
export function Spine({
  filled,
  first = false,
  last = false,
  centered = false,
}: {
  filled: boolean;
  first?: boolean;
  last?: boolean;
  /** For one-line rows (the "Show earlier purchases" link): centre the dot instead. */
  centered?: boolean;
}) {
  const { colors } = useTheme();
  const dotTop = centered ? undefined : DOT_TOP;
  const middle = centered ? '50%' : DOT_TOP + DOT_SIZE / 2;
  return (
    <View style={[styles.spine, !centered && styles.spineTop]}>
      <View
        style={[
          styles.spineLine,
          { backgroundColor: colors.border, top: first ? middle : 0 },
          last ? { height: middle } : { bottom: 0 },
        ]}
      />
      <View
        style={[
          styles.dot,
          dotTop !== undefined && { marginTop: dotTop },
          { borderColor: colors.primary, backgroundColor: filled ? colors.primary : colors.surface },
        ]}
      />
    </View>
  );
}

export function TimelineRow({
  entry,
  first,
  onRemove,
  lockedUntil,
}: {
  entry: TimelineEntry;
  first: boolean;
  onRemove: (id: string) => void;
  /** An ELSS purchase still in its lock-in: the day it ends. */
  lockedUntil: IsoDate | null;
}) {
  const { colors, spacing } = useTheme();
  const confirm = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        haptic.warn();
        Alert.alert(
          'Remove this purchase?',
          `${formatUnits(entry.units)} units bought ${formatDate(entry.purchaseDate)}. This can't be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                onRemove(entry.id);
                resolve(true);
              },
            },
          ],
        );
      }),
    [entry, onRemove],
  );

  return (
    <SwipeRow actionLabel="Remove" onAction={confirm}>
      <View style={[styles.event, { backgroundColor: colors.surface, paddingRight: spacing.lg, gap: spacing.md }]}>
        <Spine filled={entry.nav !== null} first={first} />
        <View style={[styles.flex, { paddingVertical: spacing.sm, gap: 2 }]}>
          <View style={[styles.row, { gap: spacing.md }]}>
            <AppText variant="label" numeric style={styles.flex}>
              Bought {formatDate(entry.purchaseDate)}
            </AppText>
            {entry.invested !== null ? (
              <PrivateAmount value={entry.invested} scale={VALUE_SCALE} variant="label" />
            ) : (
              <AppText variant="caption" tone="warning">
                Awaiting NAV
              </AppText>
            )}
          </View>
          <AppText variant="caption" tone="muted" numeric>
            {formatUnits(entry.units)} units
            {entry.nav !== null ? ` at ${formatNav(entry.nav)}` : ''}
            {entry.navDate !== null && entry.navDate !== entry.purchaseDate
              ? ` (NAV of ${formatDate(entry.navDate)})`
              : ''}
          </AppText>
          {entry.averageNavAfter !== null && entry.nav !== null && (
            <AppText variant="caption" tone="muted" numeric>
              Average cost now {navText(entry.averageNavAfter)}
            </AppText>
          )}
          {lockedUntil !== null && (
            <AppText variant="caption" tone="muted" numeric>
              Lock-in ends {formatDate(lockedUntil)}
            </AppText>
          )}
        </View>
      </View>
    </SwipeRow>
  );
}

/** The timeline ends at today: where the NAV is against what you paid on average. */
export function TodayRow({ last, average }: { last: NavPoint; average: bigint | null }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.event, { paddingRight: spacing.lg, gap: spacing.md }]}>
      <Spine filled last />
      <View style={[styles.flex, { paddingVertical: spacing.sm, gap: 2 }]}>
        <AppText variant="label" numeric>
          NAV {formatNav(last.nav)} on {formatDate(last.date)}
        </AppText>
        {average !== null && (
          <View style={[styles.line, { gap: 4 }]}>
            <Term term="averageCost" label="Your average cost" variant="caption" />
            <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
              is {navText(average)} a unit
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  flex: { flex: 1 },
  event: { flexDirection: 'row', alignItems: 'stretch' },
  spine: { width: 40, alignItems: 'center', justifyContent: 'center' },
  spineTop: { justifyContent: 'flex-start' },
  spineLine: { position: 'absolute', width: 2 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 2 },
});
