import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercent, formatPercentHundredths } from '@/domain/format';
import { isStale, latestChange } from '@/domain/nav';
import { headlineReturn, trailingReturns } from '@/domain/returns';
import { describeScheme } from '@/domain/schemeName';
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
 * The top of a fund page: what it is, and the one number to judge it by (3-year yearly
 * return when the history allows), with today's move under it. Everything else sits below.
 */
export function FundHero({ name, meta, points }: { name: string; meta: SchemeMeta; points: NavPoint[] }) {
  const { spacing } = useTheme();
  const label = useMemo(() => describeScheme(name), [name]);
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
          {label.option !== null && <Term term="idcw" label={label.option} />}
          {category !== null && (
            <AppText variant="label" tone="muted">
              {category}
            </AppText>
          )}
        </View>
      </View>
      {headline !== null && headline.percent !== null && (
        <View
          accessible
          accessibilityLabel={`${formatPercent(headline.percent)} ${headline.kind === 'absolute' ? 'over' : 'a year over'} ${headline.label}`}
          style={[styles.line, { gap: spacing.sm }]}
        >
          <AppText
            variant="figure"
            numeric
            tone={headline.percent > 0 ? 'gain' : headline.percent < 0 ? 'loss' : 'default'}
          >
            {formatPercent(headline.percent)}
          </AppText>
          <Term term="cagr" label={headline.key === 'ALL' ? 'a year since start' : `${headline.key} annualised`} />
        </View>
      )}
      {stale && (
        <Banner
          tone="warning"
          text={`No NAV since ${formatDate(last.date)}. This scheme may be closed or merged; figures here end on that date.`}
        />
      )}
      {change !== null && (
        <AppText
          variant="label"
          numeric
          tone={change.diff > 0n ? 'gain' : change.diff < 0n ? 'loss' : 'muted'}
          accessibilityLabel={`NAV ${formatNav(change.to.nav)} on ${formatDate(change.to.date)}, ${change.diff > 0n ? 'up' : change.diff < 0n ? 'down' : 'unchanged'} ${formatPercentHundredths(change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths, 'negative-only')} on the day`}
        >
          {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)}) on {formatDate(change.to.date)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
