import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { formatDate, ordinalDay, todayInIndia } from '@/domain/dates';
import { NAV_SCALE, VALUE_SCALE, toPlainString } from '@/domain/decimal';
import { formatInr, formatNav, formatPercent, formatUnits } from '@/domain/format';
import { holdingPeriods, lockInEndsOn, type UnitsUntil } from '@/domain/holdingPeriod';
import { holdingsByFund, portfolioDayGain, purchaseTimeline, type TimelineEntry } from '@/domain/holdings';
import { detectSip } from '@/domain/sip';
import type { IsoDate, NavPoint } from '@/domain/types';
import { evaluateLot } from '@/domain/valuation';
import { useDayChange } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Term } from '../ui/Term';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { SwipeRow } from '../ui/SwipeRow';

export interface FundLotsProps {
  schemeCode: number;
  last: NavPoint;
  /** AMFI category and name: whether the ELSS lock-in and equity long-term dates apply. */
  category: string | null;
  schemeName: string;
}

const navText = (scaled: bigint) => formatNav(toPlainString(scaled, NAV_SCALE));
/** "₹5,000": whole rupees without paise. */
const rupeesText = (rupees: number) => formatInr(BigInt(rupees) * 100n, 2).replace(/\.00$/, '');

/** Timeline dot, and its offset so it centres on a row's first line (8 pt padding + half an 18 pt line). */
const DOT_SIZE = 12;
const DOT_TOP = 8 + 9 - DOT_SIZE / 2;

/** Purchases shown before "Show earlier purchases". */
const RECENT_PURCHASES = 4;

/**
 * "Your investment", shown first when you hold the fund: the value and return, a strip of
 * three figures, then every purchase on a timeline with your average cost after each one,
 * ending at today's NAV. Renders nothing when you don't hold the fund.
 */
export function FundLots({ schemeCode, last, category, schemeName }: FundLotsProps) {
  const { colors, radius, spacing } = useTheme();
  // At large text sizes three figures can't share a row without breaking mid-number: stack them.
  const stacked = useWindowDimensions().fontScale > 1.3;
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
  const sip = useMemo(() => detectSip(lots), [lots]);
  const today = todayInIndia();
  const periods = useMemo(() => holdingPeriods(lots, category, schemeName, today), [lots, category, schemeName, today]);
  // An instalment can be added once a NAV on or after its date is out, not merely once its date has passed.
  const sipDue = sip !== null && sip.nextDate <= last.date;
  const sipWaiting = sip !== null && !sipDue && sip.nextDate <= today;
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
        <View
          style={[
            stacked ? styles.stripStacked : styles.strip,
            { backgroundColor: colors.surfaceMuted },
            stacked && { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
          ]}
        >
          <Cell label="Invested" stacked={stacked}>
            <PrivateAmount value={fund.invested} scale={VALUE_SCALE} variant="label" />
          </Cell>
          {!stacked && <Divider />}
          <Cell label="1D" stacked={stacked}>
            {dayGain !== null ? (
              <SignedAmount value={dayGain.amount} scale={VALUE_SCALE} variant="label" private />
            ) : (
              <AppText variant="label" tone="muted">
                —
              </AppText>
            )}
          </Cell>
          {!stacked && <Divider />}
          <Cell label="Units" stacked={stacked}>
            <AppText variant="label" numeric>
              {formatUnits(fund.units)}
            </AppText>
          </Cell>
        </View>
      )}

      {(periods.locked !== null || periods.shortTerm !== null) && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.xs }}>
          {periods.locked !== null && (
            <PeriodLine
              icon="lock-closed-outline"
              term="lockIn"
              label="In lock-in"
              until={periods.locked}
              total={fund.units}
              next="Next unlocks"
              all="all free by"
            />
          )}
          {periods.shortTerm !== null && (
            <PeriodLine
              icon="time-outline"
              term="longTerm"
              label="Short-term"
              until={periods.shortTerm}
              total={fund.units}
              next="Next turns long-term"
              all="all by"
            />
          )}
        </View>
      )}

      <View style={{ paddingVertical: spacing.md }}>
        {sip !== null && (
          // A running SIP: say so, and offer to catch up on instalments due since the last one.
          <View
            style={[
              {
                marginHorizontal: spacing.lg,
                marginBottom: spacing.md,
                padding: spacing.md,
                gap: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.primarySoft,
              },
            ]}
          >
            <AppText variant="labelStrong" numeric>
              {hideAmounts ? 'SIP' : `SIP of ${rupeesText(sip.amountRupees)}`} on the {ordinalDay(sip.dayOfMonth)} of each
              month
            </AppText>
            <AppText variant="caption" tone="muted" numeric>
              {sipDue
                ? `Instalments due since ${formatDate(sip.lastDate)} aren't recorded yet.`
                : sipWaiting
                  ? `The ${formatDate(sip.nextDate)} instalment can be added once its NAV is published.`
                  : `Next instalment ${formatDate(sip.nextDate)}.`}
            </AppText>
            {sipDue && (
              <Button
                label="Add instalments due"
                variant="secondary"
                icon="add"
                onPress={() =>
                  router.push({
                    pathname: '/add-holding',
                    params: {
                      code: String(schemeCode),
                      mode: 'sip',
                      amount: String(sip.amountRupees),
                      start: sip.nextDate,
                    },
                  })
                }
              />
            )}
          </View>
        )}
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
            <Spine filled={false} first centered />
            <AppText variant="label" tone="primary" style={styles.flex}>
              Show {hiddenCount} earlier {hiddenCount === 1 ? 'purchase' : 'purchases'}
            </AppText>
          </Pressable>
        )}
        {shown.map((entry, i) => (
          <TimelineRow
            key={entry.id}
            entry={entry}
            first={i === 0 && hiddenCount === 0}
            onRemove={removeLot}
            lockedUntil={periods.locked !== null ? stillLocked(entry.navDate ?? entry.purchaseDate, today) : null}
          />
        ))}
        <TodayRow last={last} average={average} />
      </View>
    </View>
  );
}

/** An ELSS purchase's lock-in end date, from its allotment (NAV) date, while it's still ahead. */
function stillLocked(allotted: IsoDate, today: IsoDate): IsoDate | null {
  const end = lockInEndsOn(allotted);
  return end > today ? end : null;
}

/**
 * "In lock-in ⓘ  1,390.3029 of 1,766.5700 units", then "Next unlocks 05 Nov 2026 · all free
 * by 05 Oct 2029": how much is waiting, then when it starts and finishes.
 */
function PeriodLine({
  icon,
  term,
  label,
  until,
  total,
  next,
  all,
}: {
  icon: 'lock-closed-outline' | 'time-outline';
  term: 'lockIn' | 'longTerm';
  label: string;
  until: UnitsUntil;
  total: bigint;
  next: string;
  all: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.periodRow, { gap: spacing.sm }]}>
      <Ionicons name={icon} size={14} color={colors.textMuted} style={styles.periodIcon} />
      <View style={[styles.flex, { gap: 2 }]}>
        <View style={[styles.line, { columnGap: spacing.sm }]}>
          <Term term={term} label={label} variant="caption" />
          <AppText variant="caption" numeric>
            {formatUnits(until.units)} of {formatUnits(total)} units
          </AppText>
        </View>
        <AppText variant="caption" tone="muted" numeric>
          {next} {formatDate(until.next)}
          {until.all !== until.next ? ` · ${all} ${formatDate(until.all)}` : ''}
        </AppText>
      </View>
    </View>
  );
}

function Cell({ label, stacked, children }: { label: string; stacked: boolean; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View
      style={
        stacked
          ? [styles.cellStacked, { paddingVertical: spacing.xs, gap: spacing.md }]
          : [styles.cell, { paddingVertical: spacing.md, gap: 2 }]
      }
    >
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

/**
 * The spine and its dot, drawn the same for every event so the eye follows one line down.
 * The dot sits beside the event's first line (its date), not the middle of its block.
 */
function Spine({
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

function TimelineRow({
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
  stripStacked: { alignItems: 'stretch' },
  cellStacked: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' },
  divider: { width: StyleSheet.hairlineWidth, marginVertical: 10 },
  event: { flexDirection: 'row', alignItems: 'stretch' },
  centered: { alignItems: 'center' },
  periodRow: { flexDirection: 'row', alignItems: 'flex-start' },
  periodIcon: { marginTop: 2 },
  spine: { width: 40, alignItems: 'center', justifyContent: 'center' },
  spineTop: { justifyContent: 'flex-start' },
  spineLine: { position: 'absolute', width: 2 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 2 },
});
