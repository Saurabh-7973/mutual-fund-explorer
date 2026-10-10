import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { fundDisplayName } from '@/components/fund/FundGate';
import { DateField } from '@/components/form/DateField';
import { SipForm } from '@/components/form/SipForm';
import { SchemeBadges } from '@/components/search/SchemeBadges';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SignedAmount } from '@/components/ui/SignedAmount';
import { SignedPercent } from '@/components/ui/SignedPercent';
import { SegmentedRow } from '@/components/ui/SegmentedRow';
import { formatDate, parseIsoDate, todayInIndia } from '@/domain/dates';
import { VALUE_SCALE } from '@/domain/decimal';
import { formatInr, formatNav } from '@/domain/format';
import { lastPoint, resolvePurchaseNavWithLatest } from '@/domain/nav';
import { describeScheme } from '@/domain/schemeName';
import { parseSchemeCode } from '@/domain/search';
import type { IsoDate } from '@/domain/types';
import { describePurchaseDate, validateUnits } from '@/domain/validation';
import { valueLot } from '@/domain/valuation';
import { useFundSeries } from '@/query/hooks';
import { newLotId } from '@/store/portfolioSchema';
import { usePortfolioStore } from '@/store/portfolioStore';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function AddHoldingScreen() {
  const params = useLocalSearchParams<{
    code: string;
    name?: string;
    mode?: string;
    amount?: string;
    start?: string;
  }>();
  const schemeCode = parseSchemeCode(params.code);
  if (schemeCode === null) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="link-outline"
          title="That link doesn't point to a scheme"
          action={{ label: 'Close', onPress: () => router.back() }}
        />
      </View>
    );
  }
  return (
    <AddHoldingForm
      schemeCode={schemeCode}
      paramName={params.name}
      sipPrefill={params.mode === 'sip' ? { amount: params.amount, start: parseIsoDate(params.start ?? '') } : null}
    />
  );
}

interface SipPrefill {
  amount: string | undefined;
  start: IsoDate | null;
}

function AddHoldingForm({
  schemeCode,
  paramName,
  sipPrefill,
}: {
  schemeCode: number;
  paramName: string | undefined;
  /** From "Add instalments due" on the fund page: open in SIP mode with these values. */
  sipPrefill: SipPrefill | null;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const series = useFundSeries(schemeCode);
  const { history, latest, points } = series;
  const name = fundDisplayName(series, paramName, schemeCode);
  const title = describeScheme(name).title;
  const addLot = usePortfolioStore((s) => s.addLot);
  const today = useMemo(() => todayInIndia(), []);

  const [unitsText, setUnitsText] = useState('');
  const [unitsTouched, setUnitsTouched] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<IsoDate | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<'once' | 'sip'>(sipPrefill !== null ? 'sip' : 'once');

  const units = validateUnits(unitsText);
  // Raw history points plus the /latest point separately: never the merged series.
  const resolution =
    history.data && purchaseDate
      ? resolvePurchaseNavWithLatest(history.data.points, latest.data?.point ?? null, purchaseDate, today)
      : null;
  const dateMessage =
    resolution !== null
      ? describePurchaseDate(resolution)
      : submitted && purchaseDate === null
        ? { tone: 'error' as const, text: 'Choose the purchase date.' }
        : null;
  const priceable = resolution !== null && (resolution.kind === 'matched' || resolution.kind === 'pending');
  const canSave = units.ok && priceable;
  const showUnitsError = !units.ok && (unitsTouched || submitted);

  const last = points !== null ? lastPoint(points) : null;
  const preview =
    units.ok && resolution?.kind === 'matched' && last !== null
      ? valueLot({
          units: units.normalized,
          appliedNav: resolution.point.nav,
          appliedDate: resolution.point.date,
          latestNav: last.nav,
          latestDate: last.date,
        })
      : null;

  const save = () => {
    if (!units.ok || resolution === null || purchaseDate === null || !priceable) {
      setSubmitted(true);
      return;
    }
    addLot({
      id: newLotId(),
      schemeCode,
      schemeName: name,
      units: units.normalized,
      purchaseDate,
      applied: resolution.kind === 'matched' ? { navDate: resolution.point.date, nav: resolution.point.nav } : null,
      createdAt: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          <SchemeBadges name={name} />
        </View>

        <SegmentedRow
          accessibilityLabel="What to add"
          options={[
            { key: 'once', label: 'One purchase' },
            { key: 'sip', label: 'Monthly SIP' },
          ]}
          selected={mode}
          onSelect={setMode}
        />

        {mode === 'sip' ? (
          history.data !== undefined && points !== null ? (
            <SipForm
              schemeCode={schemeCode}
              schemeName={name}
              historyPoints={history.data.points}
              latestPoint={latest.data?.point ?? null}
              points={points}
              today={today}
              initialAmount={sipPrefill?.amount}
              initialStart={sipPrefill?.start ?? null}
            />
          ) : history.isLoading ? (
            <AppText variant="caption" tone="muted">
              Loading NAV history to price your instalments…
            </AppText>
          ) : (
            <ErrorState compact error={history.error} onRetry={() => void history.refetch()} />
          )
        ) : (
          <>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="label">Units</AppText>
              <TextInput
                value={unitsText}
                onChangeText={setUnitsText}
                onBlur={() => setUnitsTouched(true)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="e.g. 125.432"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Units"
                style={[
                  typography.body,
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: showUnitsError ? colors.danger : colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              />
              {showUnitsError ? (
                <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
                  {units.error}
                </AppText>
              ) : (
                <AppText variant="caption" tone="muted">
                  Up to 4 decimals, exactly as on your statement.
                </AppText>
              )}
            </View>

            <View style={{ gap: spacing.xs }}>
              <DateField
                label="Purchase date"
                value={purchaseDate}
                onChange={setPurchaseDate}
                minimumDate={history.data?.points[0]?.date ?? null}
                maximumDate={today}
                message={dateMessage}
                disabled={!history.data}
              />
              {history.data === undefined &&
                (history.isLoading ? (
                  <AppText variant="caption" tone="muted">
                    Loading NAV history to price your purchase…
                  </AppText>
                ) : (
                  // Failed, or paused while offline.
                  <ErrorState compact error={history.error} onRetry={() => void history.refetch()} />
                ))}
            </View>

            <AppText variant="caption" tone="muted">
              Use the allotment date from your account statement. A purchase made after the 3 pm cut-off gets the next
              business day's NAV.
            </AppText>

            {units.ok && resolution?.kind === 'matched' && (
              <Card style={{ gap: spacing.sm }}>
                <AppText variant="label" numeric>
                  Priced at {formatNav(resolution.point.nav)} (NAV of {formatDate(resolution.point.date)})
                </AppText>
                {preview !== null && (
                  <>
                    <Row label="Invested">
                      <AppText numeric>{formatInr(preview.invested, VALUE_SCALE)}</AppText>
                    </Row>
                    <Row label={`Value as of ${formatDate(preview.latestDate)}`}>
                      <AppText numeric>{formatInr(preview.current, VALUE_SCALE)}</AppText>
                    </Row>
                    <Row label="Gain">
                      <View style={[styles.inline, { gap: spacing.sm }]}>
                        <SignedAmount value={preview.gain} scale={VALUE_SCALE} />
                        <SignedPercent hundredths={preview.returnHundredths} />
                      </View>
                    </Row>
                  </>
                )}
              </Card>
            )}
            {units.ok && resolution?.kind === 'pending' && purchaseDate !== null && (
              <Card>
                <AppText variant="label">
                  Saved as Awaiting NAV. It will be valued once the NAV for {formatDate(purchaseDate)} is published.
                </AppText>
              </Card>
            )}

            <Button label="Save" onPress={save} disabled={submitted && !canSave} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="label" tone="muted" style={styles.flex}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  input: { minHeight: MIN_TOUCH, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'baseline' },
});
