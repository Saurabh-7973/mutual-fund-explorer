import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent } from '@/domain/format';
import { annualisedReturn, holdingsByFund } from '@/domain/holdings';
import { lastPoint } from '@/domain/nav';
import { planSip, sipGain } from '@/domain/sip';
import type { IsoDate, NavPoint } from '@/domain/types';
import { validateSipAmount } from '@/domain/validation';
import { evaluateLot } from '@/domain/valuation';
import { newLotId } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SignedAmount } from '../ui/SignedAmount';
import { SignedPercent } from '../ui/SignedPercent';
import { DateField } from './DateField';
import { haptic } from '../ui/haptics';
import { TextField } from '../ui/TextField';

export interface SipFormProps {
  schemeCode: number;
  schemeName: string;
  /** Raw history (not merged with /latest), as purchase pricing requires. */
  historyPoints: readonly NavPoint[];
  latestPoint: NavPoint | null;
  /** History merged with /latest: what the preview is valued at. */
  points: readonly NavPoint[];
  today: IsoDate;
  /** Prefilled when continuing a detected SIP. */
  initialAmount?: string;
  initialStart?: IsoDate | null;
}

/**
 * A monthly SIP added in one go: amount and start date, then every instalment up to today
 * is priced like a single purchase. Built for people with years of SIPs to catch up on.
 */
export function SipForm({
  schemeCode,
  schemeName,
  historyPoints,
  latestPoint,
  points,
  today,
  initialAmount,
  initialStart = null,
}: SipFormProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const addLot = usePortfolioStore((s) => s.addLot);
  const [amountText, setAmountText] = useState(initialAmount ?? '');
  const [amountTouched, setAmountTouched] = useState(false);
  const [startDate, setStartDate] = useState<IsoDate | null>(initialStart);
  const [submitted, setSubmitted] = useState(false);

  const amount = validateSipAmount(amountText);
  const plan = useMemo(
    () =>
      amount.ok && startDate !== null ? planSip(historyPoints, latestPoint, amount.rupees, startDate, today) : null,
    [amount, startDate, historyPoints, latestPoint, today],
  );
  const last = lastPoint(points);
  const preview = useMemo(() => {
    if (plan === null || plan.instalments.length === 0 || last === null) return null;
    const lots = plan.instalments.map((i) => ({
      schemeCode,
      schemeName,
      units: i.units,
      applied: i.applied,
      status: evaluateLot({ units: i.units, applied: i.applied }, last),
    }));
    const fund = holdingsByFund(lots)[0];
    if (fund === undefined) return null;
    return { fund, xirr: annualisedReturn(lots), ...sipGain(fund.current, plan) };
  }, [plan, last, schemeCode, schemeName]);

  const showAmountError = !amount.ok && (amountTouched || submitted);
  const dateMessage =
    plan?.problem === 'before-first'
      ? {
          tone: 'error' as const,
          text: `NAV data for this fund starts ${formatDate(historyPoints[0]?.date ?? today)}. Start on or after it.`,
        }
      : submitted && startDate === null
        ? { tone: 'error' as const, text: 'Choose the date of your first instalment.' }
        : null;

  const save = () => {
    if (plan === null || plan.instalments.length === 0) {
      haptic.warn();
      setSubmitted(true);
      return;
    }
    const createdAt = new Date().toISOString();
    for (const instalment of plan.instalments) {
      addLot({
        id: newLotId(),
        schemeCode,
        schemeName,
        units: instalment.units,
        purchaseDate: instalment.purchaseDate,
        applied: instalment.applied,
        amount: instalment.amount,
        createdAt,
      });
    }
    haptic.done();
    router.back();
  };

  const count = plan?.instalments.length ?? 0;
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="label">Amount every month</AppText>
        <TextField
          value={amountText}
          onChangeText={setAmountText}
          onBlur={() => setAmountTouched(true)}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="e.g. 5000"
          accessibilityLabel="Amount every month, in rupees"
          error={showAmountError}
        />
        <AppText variant="caption" tone={showAmountError ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
          {showAmountError && !amount.ok ? amount.error : 'Whole rupees, as set in your SIP mandate.'}
        </AppText>
      </View>

      <DateField
        label="First instalment"
        value={startDate}
        onChange={setStartDate}
        minimumDate={historyPoints[0]?.date ?? null}
        maximumDate={today}
        message={dateMessage}
      />

      {preview !== null && plan !== null && (
        <Card style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="muted">
            {count} {count === 1 ? 'instalment' : 'instalments'},{' '}
            {formatDate(plan.instalments[0]?.purchaseDate ?? today)} to{' '}
            {formatDate(plan.instalments[count - 1]?.purchaseDate ?? today)}
          </AppText>
          <AppText variant="figure" numeric>
            {formatInr(preview.fund.current, VALUE_SCALE)}
          </AppText>
          <View style={[styles.line, { gap: spacing.sm }]}>
            <AppText variant="label" tone="muted" numeric>
              on {formatInr(plan.paid, VALUE_SCALE)} paid
            </AppText>
            <SignedAmount value={preview.gain} scale={VALUE_SCALE} variant="label" />
            {preview.returnHundredths !== null && (
              <SignedPercent hundredths={preview.returnHundredths} variant="label" />
            )}
          </View>
          {preview.xirr !== null && (
            <AppText variant="label" tone="muted" numeric>
              XIRR {formatPercent(preview.xirr)} p.a.
            </AppText>
          )}
          <AppText variant="caption" tone="muted">
            Units = amount ÷ each instalment's NAV. Stamp duty can move the last decimal on your statement.
          </AppText>
        </Card>
      )}

      {plan !== null && plan.awaiting.length > 0 && (
        // Shown even when nothing can be saved yet, so "why is Save empty?" has an answer.
        <AppText variant="caption" tone="warning" accessibilityLiveRegion="polite">
          {count === 0
            ? `The instalment of ${formatDate(plan.awaiting[0] ?? today)} can't be priced yet: its NAV isn't published. Add it once it is, usually the next business day.`
            : `The instalment of ${formatDate(plan.awaiting[0] ?? today)} isn't included: its NAV isn't published yet. Add it later.`}
        </AppText>
      )}

      <Button
        label={count > 0 ? `Save ${count} ${count === 1 ? 'instalment' : 'instalments'}` : 'Save'}
        onPress={save}
        disabled={count === 0 && (submitted || plan !== null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
