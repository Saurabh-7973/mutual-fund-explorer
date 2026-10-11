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
import { Term } from '../ui/Term';
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

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: spacing.xs }}>
        <FundMark schemeName={name} size={48} />
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
          {label.title}
        </AppText>
        {/* Plan and option explain themselves on tap; the category is plain text. */}
        <View style={[styles.line, { gap: spacing.md }]}>
          {label.plan !== null && <Term term="direct" label={label.plan} />}
          {option !== null && <Term term="idcw" label={option} />}
          {category !== null && (
            <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
              {category}
            </AppText>
          )}
        </View>
      </View>
      {headline !== null && headline.percent !== null && (
        <View
          accessible
          accessibilityLabel={`${formatPercent(headline.percent)} ${headline.kind === 'absolute' ? 'over' : 'per year over'} ${headline.label}`}
          style={[styles.line, { gap: spacing.sm }]}
        >
          <AppText
            variant="figure"
            numeric
            tone={headline.percent > 0 ? 'gain' : headline.percent < 0 ? 'loss' : 'default'}
          >
            {formatPercent(headline.percent)}
          </AppText>
          <Term term="cagr" label={headline.key === 'ALL' ? 'since start, p.a.' : `${headline.key} annualised`} />
        </View>
      )}
      {stale && (
        <Banner
          tone="warning"
          text={`No NAV since ${formatDate(last.date)}. This scheme may be closed or merged; figures here end on that date.`}
        />
      )}
      {last !== undefined && (
        // The NAV and its date sit above the chart: the one price a fund has, and when it was set.
        <View
          accessible
          accessibilityLabel={`NAV ${formatNav(last.nav)} as of ${formatDate(last.date)}${
            change !== null
              ? `, ${change.diff > 0n ? 'up' : change.diff < 0n ? 'down' : 'unchanged'} ${formatPercentHundredths(change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths, 'negative-only')} on the day`
              : ''
          }`}
          style={[styles.line, { columnGap: spacing.sm }]}
        >
          <AppText variant="labelStrong" numeric>
            NAV {formatNav(last.nav)}
          </AppText>
          {change !== null && (
            <AppText variant="label" numeric tone={change.diff > 0n ? 'gain' : change.diff < 0n ? 'loss' : 'muted'}>
              {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)})
            </AppText>
          )}
          <AppText variant="label" tone="muted" numeric>
            as of {formatDate(last.date)}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
