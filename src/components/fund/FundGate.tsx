import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { lastPoint } from '@/domain/nav';
import type { NavHistory, NavPoint } from '@/domain/types';
import type { useFundSeries } from '@/query/hooks';

import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';

export type FundSeries = ReturnType<typeof useFundSeries>;

export interface FundReady {
  history: NavHistory;
  points: NavPoint[];
  last: NavPoint;
}

export interface FundGateProps {
  schemeCode: number;
  series: FundSeries;
  /** Skeleton shaped like the screen's content. */
  loading: ReactNode;
  children: (ready: FundReady) => ReactNode;
}

/**
 * The loading, not-found, error and no-NAV states shared by the fund screen and
 * the NAV list. Renders `children` only when there is at least one NAV.
 */
export function FundGate({ schemeCode, series, loading, children }: FundGateProps) {
  const { history, latest, points } = series;

  if (history.data === undefined || points === null) {
    if (history.isLoading) return <>{loading}</>;
    if (isApiError(history.error) && history.error.kind === 'not_found') {
      return (
        <Centered>
          <EmptyState
            icon="document-text-outline"
            title="No NAV data for this scheme"
            body={`mfapi.in has no NAV history for code ${schemeCode}. It may be closed, merged or mistyped.`}
          />
        </Centered>
      );
    }
    // A failed fetch, or one paused because the phone is offline.
    return (
      <Centered>
        <ErrorState
          error={history.error}
          onRetry={() => {
            void history.refetch();
            void latest.refetch();
          }}
        />
      </Centered>
    );
  }

  const last = lastPoint(points);
  if (last === null) {
    return (
      <Centered>
        <EmptyState icon="hourglass-outline" title="This scheme hasn't published a NAV yet." />
      </Centered>
    );
  }
  return <>{children({ history: history.data, points, last })}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

/** Shown when the route's code isn't a scheme code at all. */
export function InvalidSchemeLink() {
  return (
    <Centered>
      <EmptyState
        icon="link-outline"
        title="That link doesn't point to a scheme"
        body="Scheme codes are numbers, such as 122639."
        action={{ label: 'Go to Explore', onPress: () => router.navigate('/') }}
      />
    </Centered>
  );
}

/** Best available name: history, then /latest, then the route param, then the code. */
export function fundDisplayName(series: FundSeries, paramName: string | undefined, schemeCode: number): string {
  return (
    series.history.data?.meta.schemeName ?? series.latest.data?.meta.schemeName ?? paramName ?? `Scheme ${schemeCode}`
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
});
