import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { formatDate, todayInIndia } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercentHundredths } from '@/domain/format';
import { isStale, latestChange } from '@/domain/nav';
import type { NavPoint } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface LatestNavCardProps {
  points: NavPoint[];
  last: NavPoint;
  skipped: number;
  schemeCode: number;
  name: string;
  /** False when the fund is already held: "Your investment" offers "Add another purchase" instead. */
  showAdd?: boolean;
}

export function LatestNavCard({ points, last, skipped, schemeCode, name, showAdd = true }: LatestNavCardProps) {
  const { spacing } = useTheme();
  const change = useMemo(() => latestChange(points), [points]);
  const stale = isStale(last.date, todayInIndia());

  let changeLine = null;
  if (change !== null) {
    const direction = change.diff > 0n ? 'up' : change.diff < 0n ? 'down' : 'unchanged';
    const magnitudeDiff = change.diff < 0n ? -change.diff : change.diff;
    const magnitudePct = change.pctHundredths < 0n ? -change.pctHundredths : change.pctHundredths;
    const since = formatDate(change.from.date);
    const label =
      direction === 'unchanged'
        ? `NAV unchanged since ${since}`
        : `NAV ${direction} ${formatNavChange(magnitudeDiff).slice(1) /* drop the "+"; the word gives the direction */}, ${formatPercentHundredths(magnitudePct, 'negative-only')}, since ${since}`;
    changeLine = (
      <AppText
        variant="label"
        numeric
        tone={direction === 'up' ? 'gain' : direction === 'down' ? 'loss' : 'muted'}
        accessibilityLabel={label}
      >
        {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)}) since {since}
      </AppText>
    );
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <AppText variant="label" tone="muted">
        Latest NAV
      </AppText>
      <AppText variant="figure" numeric>
        {formatNav(last.nav)}
      </AppText>
      <AppText variant="label" tone="muted">
        as of {formatDate(last.date)}
      </AppText>
      {changeLine}
      {stale && (
        <Banner
          tone="warning"
          text={`The latest NAV is from ${formatDate(last.date)}. This scheme may be closed, merged or no longer publishing.`}
        />
      )}
      {skipped > 0 && (
        <AppText variant="caption" tone="muted">
          {skipped} malformed or duplicate rows in the source data were skipped.
        </AppText>
      )}
      {showAdd && (
        <View style={{ marginTop: spacing.xs }}>
          <Button
            label="Add a holding"
            icon="add"
            onPress={() => router.push({ pathname: '/add-holding', params: { code: String(schemeCode), name } })}
          />
        </View>
      )}
    </Card>
  );
}
