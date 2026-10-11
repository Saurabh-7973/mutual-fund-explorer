import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercent, formatPercentHundredths } from '@/domain/format';
import { isStale, latestChange } from '@/domain/nav';
import { headlineReturn, trailingReturns } from '@/domain/returns';
import { describeScheme, optionFromIsins } from '@/domain/schemeName';
import type { NavPoint, SchemeMeta } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Term, TermChip } from '../ui/Term';
import { Banner } from '../ui/Banner';
import { FundMark } from '../ui/FundMark';

/** "Equity Scheme - Flexi Cap Fund" → "Equity · Flexi Cap", the way investors name categories. */
function shortCategory(category: string | null): string | null {
  if (category === null) return null;
  const [kind, rest] = category.split(/\s+-\s+/);
  const cleanKind = kind?.replace(/\s+Scheme$/i, '') ?? '';
  const cleanRest = rest?.replace(/\s+Fund$/i, '') ?? '';
  return [cleanKind, cleanRest].filter(Boolean).join(' · ') || null;
}

/**
 * The top of a fund page: what it is, and the one number to judge it by (3-year annualised
 * return when the history allows), with today's move under it. Everything else sits below.
 */
export function FundHero({ name, meta, points }: { name: string; meta: SchemeMeta; points: NavPoint[] }) {
  const { spacing } = useTheme();
  const label = useMemo(() => describeScheme(name), [name]);
  const option = label.option ?? optionFromIsins(meta.isinGrowth, meta.isinDivReinvestment);
  const headline = useMemo(() => headlineReturn(trailingReturns(points)), [points]);
  const change = useMemo(() => latestChange(points), [points]);
  const last = points[points.length - 1];
  const stale = last !== undefined && isStale(last.date, todayInIndia());
  const category = shortCategory(meta.schemeCategory);

  const annualised = headline !== null && headline.kind !== 'absolute';
  const headlineLabel =
    headline === null
      ? ''
      : headline.key === 'ALL'
        ? `Return since start${annualised ? ', annualised' : ''}`
        : `${headline.label.replace(/^(\d+) (year|month)s?$/, '$1-$2')} return${annualised ? ', annualised' : ''}`;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.md }}>
        <View style={[styles.row, { gap: spacing.md }]}>
          <FundMark schemeName={name} size={44} />
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            {label.title}
          </AppText>
        </View>
        {/* Plan, option and category as chips; each opens its plain explanation. */}
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {label.plan !== null && <TermChip term="direct" label={label.plan} />}
          {option !== null && <TermChip term="idcw" label={option} />}
          {category !== null && <TermChip term="assetClass" label={category} />}
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        {headline !== null && headline.percent !== null && (
          <>
            <Term term={annualised ? 'cagr' : 'absolute'} label={headlineLabel} />
            <View
              accessible
              accessibilityLabel={`${formatPercent(headline.percent)}${annualised ? ' per year' : ''} over ${headline.label}`}
              style={[styles.line, { gap: spacing.xs }]}
            >
              <AppText
                variant="hero"
                numeric
                maxFontSizeMultiplier={1.2}
                tone={headline.percent > 0 ? 'gain' : headline.percent < 0 ? 'loss' : 'default'}
              >
                {formatPercent(headline.percent)}
              </AppText>
              {annualised && (
                <AppText
                  variant="heading"
                  maxFontSizeMultiplier={1.2}
                  tone={headline.percent > 0 ? 'gain' : headline.percent < 0 ? 'loss' : 'default'}
                >
                  p.a.
                </AppText>
              )}
            </View>
          </>
        )}
        {last !== undefined && (
          // The NAV and its date: the one price a fund has, and when it was set.
          // "NAV ⓘ" is its own control so screen readers can reach it; the figures read as one.
          <View style={[styles.line, { columnGap: spacing.sm }]}>
            <Term term="nav" label="NAV" variant="rowTitle" tone="default" />
            <View
              accessible
              accessibilityLabel={`${formatNav(last.nav)} as of ${formatDate(last.date)}${
                change !== null
                  ? `, ${change.diff > 0n ? 'up' : change.diff < 0n ? 'down' : 'unchanged'} ${formatPercentHundredths(change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths, 'negative-only')} on the day`
                  : ''
              }`}
              style={[styles.line, { columnGap: spacing.sm }]}
            >
              <AppText variant="rowTitle" numeric>
                {formatNav(last.nav)}
              </AppText>
              {change !== null && (
                <AppText variant="rowTitle" numeric tone={change.diff > 0n ? 'gain' : change.diff < 0n ? 'loss' : 'muted'}>
                  {formatPercentHundredths(change.pctHundredths)} today
                </AppText>
              )}
              <AppText variant="label" tone="muted" numeric>
                · {formatDate(last.date)}
              </AppText>
            </View>
          </View>
        )}
      </View>
      {stale && (
        <Banner
          tone="warning"
          text={`No NAV since ${formatDate(last.date)}. This scheme may be closed or merged; figures here end on that date.`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
