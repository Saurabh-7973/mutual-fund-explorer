import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { diffDays, formatDate, formatDuration, ordinalDay, todayInIndia } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent, formatUnits } from '@/domain/format';
import { holdingPeriods } from '@/domain/holdingPeriod';
import { holdingsByFund, portfolioDayGain, purchaseTimeline } from '@/domain/holdings';
import { detectSip } from '@/domain/sip';
import type { NavPoint } from '@/domain/types';
import { evaluateLot } from '@/domain/valuation';
import { useDayChange } from '@/query/hooks';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { ChangeChip } from '../ui/ChangeChip';
import { MoneyHero } from '../ui/MoneyHero';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedAmount } from '../ui/SignedAmount';
import { haptic } from '../ui/haptics';
import { easeNextLayout } from '../ui/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { PeriodLine, stillLocked } from './lots/PeriodLine';
import { Cell, Divider } from './lots/StripCell';
import { Spine, TimelineRow, TodayRow } from './lots/Timeline';

export interface FundLotsProps {
  schemeCode: number;
  last: NavPoint;
  /** AMFI category and name: whether the ELSS lock-in and equity long-term dates apply. */
  category: string | null;
  schemeName: string;
}

/** "₹5,000": whole rupees without paise. */
const rupeesText = (rupees: number) => formatInr(BigInt(rupees) * 100n, 2).replace(/\.00$/, '');

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
  const reduced = useReducedMotion();
  const removeWithEase = useCallback(
    (id: string) => {
      easeNextLayout(reduced);
      removeLot(id);
    },
    [removeLot, reduced],
  );
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
  const firstDate = timeline[0]?.purchaseDate;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}
    >
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs }}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="heading" accessibilityRole="header">
              Your investment
            </AppText>
            {firstDate !== undefined && (
              <AppText variant="caption" tone="muted">
                Invested for {formatDuration(diffDays(firstDate, today))}
              </AppText>
            )}
          </View>
          <IconButton
            name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => {
              haptic.tap();
              toggleHideAmounts();
            }}
            selected={hideAmounts}
            accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
          />
        </View>
        {fund.valuedCount > 0 ? (
          <>
            <MoneyHero value={fund.current} scale={VALUE_SCALE} />
            <View style={[styles.row, { gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs }]}>
              <ChangeChip amount={fund.gain} scale={VALUE_SCALE} pctHundredths={fund.returnHundredths} private />
              {fund.xirrPercent !== null && (
                <AppText
                  variant="label"
                  tone="muted"
                  numeric
                  accessibilityLabel={`XIRR ${formatPercent(fund.xirrPercent)} per year`}
                >
                  XIRR {formatPercent(fund.xirrPercent)} p.a.
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
            // Inset hairlines above and below, like the figures strip on Holdings.
            { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, marginHorizontal: spacing.lg },
            stacked && { paddingVertical: spacing.sm },
          ]}
        >
          <Cell label="Invested" stacked={stacked}>
            <PrivateAmount value={fund.invested} scale={VALUE_SCALE} variant="label" />
          </Cell>
          {!stacked && <Divider />}
          <Cell label="Today" stacked={stacked}>
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
              nav={last.nav}
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
              nav={last.nav}
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
                ? `Instalments from ${formatDate(sip.nextDate)} aren't recorded yet.`
                : sipWaiting
                  ? `The ${formatDate(sip.nextDate)} instalment can be added once its NAV is published.`
                  : `Next instalment ${formatDate(sip.nextDate)}.`}
            </AppText>
            {sipDue && (
              <Button
                label="Add instalments due"
                variant="surface"
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
            onRemove={removeWithEase}
            lockedUntil={periods.locked !== null ? stillLocked(entry.navDate ?? entry.purchaseDate, today) : null}
          />
        ))}
        <TodayRow last={last} average={average} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  flex: { flex: 1 },
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  stripStacked: { alignItems: 'stretch' },
  event: { flexDirection: 'row', alignItems: 'stretch' },
  centered: { alignItems: 'center' },
});
