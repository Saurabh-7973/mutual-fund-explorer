import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent } from '@/domain/format';
import { replayInvestment, type InvestMode } from '@/domain/longTerm';
import { rangeCovered } from '@/domain/nav';
import type { NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Chip } from '../ui/Chip';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';

const AMOUNTS: Record<InvestMode, number[]> = { sip: [1000, 5000, 10000], lumpsum: [10000, 50000, 100000] };
const PERIODS = [
  { label: '1Y', months: 12 },
  { label: '3Y', months: 36 },
  { label: '5Y', months: 60 },
  { label: '10Y', months: 120 },
];

/** "₹5,000" without paise, for the amount chips. */
const rupees = (amount: number) => formatInr(BigInt(amount) * 100n, 2).replace(/\.00$/, '');

/**
 * What a regular investment in this fund would be worth today, replayed on its real NAVs.
 * Long-term investors think in "monthly SIP for five years", so that's the question it answers.
 */
export function InvestReplay({ points }: { points: NavPoint[] }) {
  const { spacing } = useTheme();
  const [mode, setMode] = useState<InvestMode>('sip');
  const [amount, setAmount] = useState(5000);
  const covered = PERIODS.filter((p) => rangeCovered(points, p.months));
  const [months, setMonths] = useState<number | null>(null);
  const chosen = months ?? covered.find((p) => p.months === 60)?.months ?? covered[covered.length - 1]?.months ?? null;

  const replay = useMemo(
    () => (chosen === null ? null : replayInvestment(points, amount, chosen, mode)),
    [points, amount, chosen, mode],
  );
  if (covered.length === 0) return null;

  const switchMode = (next: InvestMode) => {
    setMode(next);
    setAmount(next === 'sip' ? 5000 : 50000);
  };
  const years = chosen === null ? '' : `${chosen / 12} ${chosen === 12 ? 'year' : 'years'}`;

  return (
    <>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        <Chip label="Monthly SIP" selected={mode === 'sip'} onPress={() => switchMode('sip')} />
        <Chip label="One time" selected={mode === 'lumpsum'} onPress={() => switchMode('lumpsum')} />
      </View>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {AMOUNTS[mode].map((value) => (
          <Chip key={value} label={rupees(value)} selected={amount === value} onPress={() => setAmount(value)} />
        ))}
      </View>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {PERIODS.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            selected={chosen === p.months}
            disabled={!covered.includes(p)}
            onPress={() => setMonths(p.months)}
          />
        ))}
      </View>

      {replay !== null && (
        <View style={{ gap: spacing.xs }} accessibilityLiveRegion="polite">
          <AppText variant="label" tone="muted">
            {mode === 'sip'
              ? `${rupees(amount)} a month for ${years} would be worth`
              : `${rupees(amount)} invested ${years} ago would be worth`}
          </AppText>
          <AppText variant="figure" numeric>
            {formatInr(replay.current, VALUE_SCALE)}
          </AppText>
          <View style={[styles.line, { gap: spacing.sm }]}>
            <AppText variant="label" tone="muted" numeric>
              on {formatInr(replay.invested, VALUE_SCALE)} invested
            </AppText>
            <SignedAmount value={replay.gain} scale={VALUE_SCALE} variant="label" />
            <SignedPercent hundredths={replay.returnHundredths} variant="label" />
          </View>
          {replay.xirrPercent !== null && (
            <AppText
              variant="label"
              tone="muted"
              numeric
              accessibilityLabel={`XIRR ${formatPercent(replay.xirrPercent)} per year`}
            >
              XIRR {formatPercent(replay.xirrPercent)} a year
            </AppText>
          )}
        </View>
      )}
      {replay !== null && (
        <AppText variant="caption" tone="muted">
          Replays this fund's real NAVs from {formatDate(replay.firstDate)} to {formatDate(replay.valueDate)}: each
          purchase at the next published NAV, before taxes and exit loads. Past returns don't predict future ones.
        </AppText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
