import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';

import type { GlossaryKey } from '@/domain/glossary';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatPercent } from '@/domain/format';
import type { AllocationSlice, AssetClassSlice, DayGain } from '@/domain/holdings';
import type { PortfolioTotals } from '@/domain/valuation';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { PrivateAmount } from '../ui/PrivateAmount';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { Skeleton } from '../ui/Skeleton';
import { Term } from '../ui/Term';
import { AllocationCard } from './AllocationCard';

export interface PortfolioSummaryProps {
  fundCount: number;
  /** A fund's latest NAV is still on its first load: no partial totals. */
  loading: boolean;
  totals: PortfolioTotals;
  dayGain: DayGain | null;
  xirr: number | null;
  classSlices: AssetClassSlice[];
  slices: AllocationSlice[];
  /** Purchases awaiting a NAV or not loaded, left out of the totals. */
  excluded: number;
}

/** The Holdings summary card: current value, today's and total returns, invested, XIRR and allocation. */
export function PortfolioSummary({
  fundCount,
  loading: anyFirstLoad,
  totals,
  dayGain,
  xirr,
  classSlices,
  slices,
  excluded,
}: PortfolioSummaryProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        styles.summary,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          margin: spacing.lg,
          padding: spacing.lg,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <AppText variant="label" tone="muted" style={styles.flex}>
          {fundCount === 1 ? '1 fund' : `${fundCount} funds`} · current value
        </AppText>
      </View>
      {anyFirstLoad ? (
        // Never show partial totals while a fund's latest NAV is still on its first load.
        <View accessible accessibilityLabel="Loading totals" style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          <Skeleton width={200} height={34} />
          <Skeleton width={240} height={16} />
        </View>
      ) : (
        <>
          <PrivateAmount value={totals.current} scale={VALUE_SCALE} variant="figure" />
          <View style={[styles.rule, { borderColor: colors.border, marginVertical: spacing.md }]} />
          <View style={{ gap: spacing.sm }}>
            <Row label="1D returns" term="oneDay">
              {dayGain !== null ? (
                <View style={[styles.inline, { gap: spacing.xs }]}>
                  <SignedAmount value={dayGain.amount} scale={VALUE_SCALE} variant="label" private />
                  <SignedPercent hundredths={dayGain.pctHundredths} variant="label" />
                </View>
              ) : (
                <AppText variant="label" tone="muted">
                  —
                </AppText>
              )}
            </Row>
            <Row label="Total returns">
              <View style={[styles.inline, { gap: spacing.xs }]}>
                <SignedAmount value={totals.gain} scale={VALUE_SCALE} variant="label" private />
                {totals.returnHundredths !== null && (
                  <SignedPercent hundredths={totals.returnHundredths} variant="label" />
                )}
              </View>
            </Row>
            <Row label="Invested">
              <PrivateAmount value={totals.invested} scale={VALUE_SCALE} variant="label" />
            </Row>
            <Row label="XIRR" term="xirr">
              {xirr !== null ? (
                <AppText
                  variant="label"
                  numeric
                  tone={xirr > 0 ? 'gain' : xirr < 0 ? 'loss' : 'muted'}
                  accessibilityLabel={`${formatPercent(xirr)} per year`}
                >
                  {formatPercent(xirr)} p.a.
                </AppText>
              ) : (
                <AppText variant="label" tone="muted">
                  after your first year
                </AppText>
              )}
            </Row>
          </View>
          <View style={[styles.rule, { borderColor: colors.border, marginVertical: spacing.md }]} />
          <AllocationCard byClass={classSlices} byFund={slices} />
        </>
      )}
      {excluded > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <AppText variant="caption" tone="warning">
            {[
              totals.pendingCount > 0 ? `${totals.pendingCount} awaiting NAV` : null,
              totals.unavailableCount > 0 ? `${totals.unavailableCount} not loaded` : null,
            ]
              .filter((part): part is string => part !== null)
              .join(' and ')}{' '}
            {excluded === 1 ? "isn't" : "aren't"} in these totals.
          </AppText>
        </View>
      )}
    </View>
  );
}

function Row({ label, term, children }: { label: string; term?: GlossaryKey; children: ReactNode }) {
  // At large text sizes a label and a long figure can't share a line: the label goes above.
  const stacked = useWindowDimensions().fontScale > 1.3;
  return (
    <View style={stacked ? styles.kvStacked : styles.kv}>
      <View style={stacked ? undefined : styles.flex}>
        {term !== undefined ? (
          <Term term={term} label={label} />
        ) : (
          // Capped like the glossary labels, so every label in the card is one size.
          <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
            {label}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { borderWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  rule: { borderTopWidth: 1, borderStyle: 'dashed' },
  kv: { flexDirection: 'row', alignItems: 'center', minHeight: 22 },
  kvStacked: { gap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center' },
});
