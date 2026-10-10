import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatPercent } from '@/domain/format';
import { annualisedReturn, holdingsByFund } from '@/domain/holdings';
import { lastPoint } from '@/domain/nav';
import { planSip } from '@/domain/sip';
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
import { DateField } from './DateField';

export interface SipFormProps {
  schemeCode: number;
  schemeName: string;
  /** Raw history (not merged with /latest), as purchase pricing requires. */
  historyPoints: readonly NavPoint[];
  latestPoint: NavPoint | null;
  /** History merged with /latest: what the preview is valued at. */
  points: readonly NavPoint[];
  today: IsoDate;
}

/**
 * A monthly SIP added in one go: amount and start date, then every instalment up to today
 * is priced like a single purchase. Built for people with years of SIPs to catch up on.
 */
export function SipForm({ schemeCode, schemeName, historyPoints, latestPoint, points, today }: SipFormProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const addLot = usePortfolioStore((s) => s.addLot);
  const [amountText, setAmountText] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [startDate, setStartDate] = useState<IsoDate | null>(null);
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
    return { fund: holdingsByFund(lots)[0], xirr: annualisedReturn(lots) };
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
        createdAt,
      });
    }
    router.back();
  };

  const count = plan?.instalments.length ?? 0;
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="label">Amount every month</AppText>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          onBlur={() => setAmountTouched(true)}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="e.g. 5000"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Amount every month, in rupees"
          style={[
            typography.body,
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: showAmountError ? colors.danger : colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
            },
          ]}
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

      {preview !== null && preview.fund !== undefined && plan !== null && (
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
            <SignedAmount value={preview.fund.current - plan.paid} scale={VALUE_SCALE} variant="label" />
          </View>
          {preview.xirr !== null && (
            <AppText variant="label" tone="muted" numeric>
              XIRR {formatPercent(preview.xirr)} a year
            </AppText>
          )}
          {plan.awaiting.length > 0 && (
            <AppText variant="caption" tone="warning">
              The instalment of {formatDate(plan.awaiting[0] ?? today)} isn't included: its NAV isn't published yet. Add
              it later as a single purchase.
            </AppText>
          )}
          <AppText variant="caption" tone="muted">
            Units are worked out as the amount ÷ the NAV of each instalment's date (or the next NAV after a holiday).
            Your statement may differ in the last decimal because of stamp duty.
          </AppText>
        </Card>
      )}

      <Button
        label={count > 0 ? `Save ${count} ${count === 1 ? 'instalment' : 'instalments'}` : 'Save'}
        onPress={save}
        disabled={submitted && count === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: MIN_TOUCH, borderWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
