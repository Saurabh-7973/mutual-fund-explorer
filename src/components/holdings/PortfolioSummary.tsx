import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';

import type { GlossaryKey } from '@/domain/glossary';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatPercent } from '@/domain/format';
import type { AllocationSlice, AssetClassSlice, DayGain } from '@/domain/holdings';
import type { PortfolioTotals } from '@/domain/valuation';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { ChangeChip } from '../ui/ChangeChip';
import { MoneyHero } from '../ui/MoneyHero';
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

/**
 * The top of Holdings. The current value is the hero, on the page itself rather than in a
 * card, with the total return as a tinted chip under it; then one card with invested,
 * today's change and XIRR side by side; then allocation.
 */
export function PortfolioSummary({
  fundCount,
  loading,
  totals,
  dayGain,
  xirr,
  classSlices,
  slices,
  excluded,
}: PortfolioSummaryProps) {
  const { colors, spacing } = useTheme();
  // At large text sizes three figures can't share a row: each gets its own line, and amounts
  // shorten to lakh/crore so they fit. Otherwise the summary is exact, to match the statement.
  const stacked = useWindowDimensions().fontScale > 1.3;

  if (loading) {
    // Never show partial totals while a fund's latest NAV is still on its first load.
    return (
      <View accessible accessibilityLabel="Loading totals" style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton width={110} height={14} />
        <Skeleton width={240} height={44} />
        <Skeleton width={200} height={28} />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
        <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
          Current value
        </AppText>
        <MoneyHero value={totals.current} scale={VALUE_SCALE} />
        <View style={[styles.inline, { gap: spacing.sm, marginTop: spacing.xs }]}>
          <ChangeChip amount={totals.gain} scale={VALUE_SCALE} pctHundredths={totals.returnHundredths} private compact={stacked} />
          <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
            total return
          </AppText>
        </View>
      </View>

      <Card style={{ paddingVertical: spacing.md }}>
        <View style={stacked ? { gap: spacing.md } : styles.strip}>
          <Cell label="Invested" stacked={stacked}>
            <PrivateAmount value={totals.invested} scale={VALUE_SCALE} variant="rowTitle" maxFontSizeMultiplier={1.3} compact={stacked} />
          </Cell>
          {!stacked && <View style={[styles.divider, { backgroundColor: colors.hairline }]} />}
          <Cell label="Today" term="oneDay" stacked={stacked}>
            {dayGain !== null ? (
              <>
                <SignedAmount value={dayGain.amount} scale={VALUE_SCALE} variant="rowTitle" maxFontSizeMultiplier={1.3} private compact={stacked} />
                <SignedPercent hundredths={dayGain.pctHundredths} variant="label" maxFontSizeMultiplier={1.3} />
              </>
            ) : (
              <AppText variant="rowTitle" tone="muted" maxFontSizeMultiplier={1.3}>
                —
              </AppText>
            )}
          </Cell>
          {!stacked && <View style={[styles.divider, { backgroundColor: colors.hairline }]} />}
          <Cell label="XIRR" term="xirr" stacked={stacked}>
            {xirr !== null ? (
              <>
                <AppText
                  variant="rowTitle"
                  numeric
                  maxFontSizeMultiplier={1.3}
                  tone={xirr > 0 ? 'gain' : xirr < 0 ? 'loss' : 'muted'}
                  accessibilityLabel={`${formatPercent(xirr)} per year`}
                >
                  {formatPercent(xirr)}
                </AppText>
                <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
                  p.a.
                </AppText>
              </>
            ) : (
              <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
                after your first year
              </AppText>
            )}
          </Cell>
        </View>
      </Card>

      {fundCount > 0 && slices.length > 0 && (
        <Card>
          <AllocationCard byClass={classSlices} byFund={slices} />
        </Card>
      )}

      {excluded > 0 && (
        <AppText variant="caption" tone="warning">
          {[
            totals.pendingCount > 0 ? `${totals.pendingCount} awaiting NAV` : null,
            totals.unavailableCount > 0 ? `${totals.unavailableCount} not loaded` : null,
          ]
            .filter((part): part is string => part !== null)
            .join(' and ')}{' '}
          {excluded === 1 ? "isn't" : "aren't"} in these totals.
        </AppText>
      )}
    </View>
  );
}

/** One figure in the strip: its label above, the value under it (a label/value row at large text). */
function Cell({ label, term, stacked, children }: { label: string; term?: GlossaryKey; stacked: boolean; children: ReactNode }) {
  const { spacing } = useTheme();
  const heading =
    term !== undefined ? (
      <Term term={term} label={label} variant="label" />
    ) : (
      <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
        {label}
      </AppText>
    );
  if (stacked) {
    return (
      <View style={styles.kvStacked}>
        {heading}
        <View style={styles.valueStacked}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[styles.cell, { gap: 2, paddingHorizontal: spacing.xs }]}>
      {heading}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  // Each cell takes the width its figure needs, so a long amount isn't broken over two lines.
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  divider: { width: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  kvStacked: { gap: 2 },
  valueStacked: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
});
