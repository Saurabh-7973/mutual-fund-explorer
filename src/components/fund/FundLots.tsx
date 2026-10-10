import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { formatDate } from '@/domain/dates';
import { NAV_SCALE, VALUE_SCALE, toPlainString } from '@/domain/decimal';
import { formatNav, formatPercent, formatUnits } from '@/domain/format';
import { holdingsByFund, portfolioDayGain, purchaseTimeline, type TimelineEntry } from '@/domain/holdings';
import type { NavPoint } from '@/domain/types';
import { evaluateLot } from '@/domain/valuation';
import { useDayChange } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { IconButton } from '../ui/IconButton';
import { Term } from '../ui/Term';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { SwipeRow } from '../ui/SwipeRow';

export interface FundLotsProps {
  schemeCode: number;
  last: NavPoint;
}

const navText = (scaled: bigint) => formatNav(toPlainString(scaled, NAV_SCALE));

/** Purchases shown before "Show earlier purchases". */
const RECENT_PURCHASES = 4;

/**
 * "Your investment", shown first when you hold the fund: the value and return, a strip of
 * three figures, then every purchase on a timeline with your average cost after each one,
 * ending at today's NAV. Renders nothing when you don't hold the fund.
 */
export function FundLots({ schemeCode, last }: FundLotsProps) {
  const { colors, radius, spacing } = useTheme();
  const lots = usePortfolioStore(useShallow((s) => s.lots.filter((lot) => lot.schemeCode === schemeCode)));
  const removeLot = usePortfolioStore((s) => s.removeLot);
  const hideAmounts = usePreferencesStore((s) => s.hideAmounts);
  const toggleHideAmounts = usePreferencesStore((s) => s.toggleHideAmounts);
  const change = useDayChange(schemeCode, last);

  const fund = useMemo(
    () => holdingsByFund(lots.map((lot) => ({ ...lot, status: evaluateLot(lot, last) })))[0],
    [lots, last],
  );
  const timeline = useMemo(() => purchaseTimeline(lots), [lots]);
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = showAll ? 0 : Math.max(0, timeline.length - RECENT_PURCHASES);
  const shown = hiddenCount > 0 ? timeline.slice(hiddenCount) : timeline;
  const dayGain = useMemo(
    () => (fund === undefined ? null : portfolioDayGain([fund], new Map([[schemeCode, change]]))),
    [fund, schemeCode, change],
  );
  if (fund === undefined) return null;
  const average = timeline[timeline.length - 1]?.averageNavAfter ?? null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs }}>
        <View style={styles.row}>
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
                  · XIRR {formatPercent(fund.xirrPercent)} a year
                </AppText>
              )}
            </View>
          </>
        ) : (
          <AppText tone="muted">Waiting for the NAV of your purchase date.</AppText>
        )}
      </View>

      {fund.valuedCount > 0 && (
        <View style={[styles.strip, { backgroundColor: colors.surfaceMuted }]}>
          <Cell label="Invested">
            <PrivateAmount value={fund.invested} scale={VALUE_SCALE} variant="label" />
          </Cell>
          <Divider />
          <Cell label="1D">
            {dayGain !== null ? (
              <SignedAmount value={dayGain.amount} scale={VALUE_SCALE} variant="label" private />
            ) : (
              <AppText variant="label" tone="muted">
                —
              </AppText>
            )}
          </Cell>
          <Divider />
          <Cell label="Units">
            <AppText variant="label" numeric>
              {formatUnits(fund.units)}
            </AppText>
          </Cell>
        </View>
      )}

      <View style={{ paddingVertical: spacing.md }}>
        <AppText variant="label" tone="muted" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
          {timeline.length} {timeline.length === 1 ? 'purchase' : 'purchases'} · swipe one to remove it
        </AppText>
        {hiddenCount > 0 && (
          // A long SIP would be dozens of rows: show the latest few, the rest on request.
          <Pressable
            onPress={() => setShowAll(true)}
            accessibilityRole="button"
            style={[styles.event, styles.centered, { paddingRight: spacing.lg, gap: spacing.md, minHeight: 44 }]}
          >
            <Spine filled={false} first />
            <AppText variant="label" tone="primary" style={styles.flex}>
              Show {hiddenCount} earlier {hiddenCount === 1 ? 'purchase' : 'purchases'}
            </AppText>
          </Pressable>
        )}
        {shown.map((entry, i) => (
          <TimelineRow key={entry.id} entry={entry} first={i === 0 && hiddenCount === 0} onRemove={removeLot} />
        ))}
        <TodayRow last={last} average={average} />
      </View>
    </View>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.cell, { paddingVertical: spacing.md, gap: 2 }]}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

/** The spine and its dot, drawn the same for every event so the eye follows one line down. */
function Spine({ filled, first = false, last = false }: { filled: boolean; first?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.spine}>
      <View
        style={[styles.spineLine, { backgroundColor: colors.border, top: first ? '50%' : 0, bottom: last ? '50%' : 0 }]}
      />
      <View
        style={[styles.dot, { borderColor: colors.primary, backgroundColor: filled ? colors.primary : colors.surface }]}
      />
    </View>
  );
}

function TimelineRow({
  entry,
  first,
  onRemove,
}: {
  entry: TimelineEntry;
  first: boolean;
  onRemove: (id: string) => void;
}) {
  const { colors, spacing } = useTheme();
  const confirm = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
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
        </View>
      </View>
    </SwipeRow>
  );
}

/** The timeline ends at today: where the NAV is against what you paid on average. */
function TodayRow({ last, average }: { last: NavPoint; average: bigint | null }) {
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
            <AppText variant="caption" tone="muted" numeric>
              is {navText(average)} a unit
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  flex: { flex: 1 },
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, marginVertical: 10 },
  event: { flexDirection: 'row', alignItems: 'stretch' },
  centered: { alignItems: 'center' },
  spine: { width: 40, alignItems: 'center', justifyContent: 'center' },
  spineLine: { position: 'absolute', width: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
