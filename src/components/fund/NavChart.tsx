import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildChartGeometry, chartSummary, nearestIndex, type ChartGeometry } from '@/domain/chart';
import { formatDate } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercentHundredths } from '@/domain/format';
import { navChange } from '@/domain/nav';
import type { NavPoint } from '@/domain/types';
import { tabularNumbers } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * NAV line chart: react-native-svg for drawing, Gesture Handler for scrubbing.
 * Runs in Expo Go (no Skia, no Reanimated). Long series are downsampled to about
 * 150 points by buildChartGeometry, so drawing cost doesn't grow with history length.
 *
 * Scrubbing state lives here, not in the screen, so dragging re-renders only the chart.
 * Put this inside a ScrollView from 'react-native-gesture-handler' so a vertical swipe
 * scrolls the page and a horizontal drag scrubs.
 */

const DEFAULT_HEIGHT = 200;
const PADDING = { padTop: 12, padBottom: 12, padX: 2 };

export interface NavChartProps {
  /** NAVs for the selected range, oldest first (already sliced). */
  points: readonly NavPoint[];
  /** How the range reads in a sentence: "1 year", "6 months", "since 28 May 2013". */
  rangeLabel: string;
  height?: number;
}

export function NavChart({ points, rangeLabel, height = DEFAULT_HEIGHT }: NavChartProps) {
  const { colors, spacing, typography } = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);

  const geometry = useMemo(
    () => (width > 0 ? buildChartGeometry(points, { width, height, ...PADDING }) : null),
    [points, width, height],
  );
  const change = useMemo(() => {
    const first = points[0];
    const last = points[points.length - 1];
    return first !== undefined && last !== undefined ? navChange(first, last) : null;
  }, [points]);
  const summary = useMemo(() => chartSummary(points), [points]);
  // From the full range, not the downsampled points, so the labels are exact.
  const extremes = useMemo(() => lowAndHigh(points), [points]);

  const lineColor = change !== null && change.diff < 0n ? colors.loss : colors.gain;

  const scrubTo = useCallback(
    (x: number) => {
      if (geometry === null) return;
      const index = nearestIndex(geometry.xs, x);
      setActiveIndex((current) => (current === index ? current : index));
    },
    [geometry],
  );
  const release = useCallback(() => setActiveIndex(null), []);

  const gesture = useMemo(() => {
    // A horizontal drag scrubs at once; a vertical swipe fails it, so the page scrolls instead.
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-6, 6])
      .failOffsetY([-10, 10])
      .onStart((event) => scrubTo(event.x))
      .onUpdate((event) => scrubTo(event.x))
      .onFinalize(release);
    // Touch and hold, then move in any direction.
    const hold = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(250)
      .onStart((event) => scrubTo(event.x))
      .onUpdate((event) => scrubTo(event.x))
      .onFinalize(release);
    return Gesture.Race(drag, hold);
  }, [scrubTo, release]);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height, borderColor: colors.border }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>Not enough NAV data in this range to draw a chart.</Text>
      </View>
    );
  }

  const active = activeIndex !== null && geometry !== null ? geometry.points[activeIndex] : undefined;
  const activeX = activeIndex !== null ? geometry?.xs[activeIndex] : undefined;
  const activeY = activeIndex !== null ? geometry?.ys[activeIndex] : undefined;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.readout}>
        {active !== undefined ? (
          <>
            <Text style={[typography.heading, tabularNumbers, { color: colors.text }]}>{formatNav(active.nav)}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>NAV on {formatDate(active.date)}</Text>
          </>
        ) : change !== null ? (
          <>
            <Text style={[typography.heading, tabularNumbers, { color: lineColor }]}>
              {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)})
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              NAV change over {rangeLabel} · absolute, not annualised · drag the chart to see a date
            </Text>
          </>
        ) : null}
      </View>

      <GestureDetector gesture={gesture}>
        <View
          onLayout={onLayout}
          style={{ height }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={summary ?? 'NAV chart'}
        >
          {geometry !== null && (
            <Svg width={width} height={height}>
              <ChartPaths geometry={geometry} color={lineColor} />
              {activeX !== undefined && activeY !== undefined && (
                <>
                  <Line x1={activeX} y1={0} x2={activeX} y2={height} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="4 4" />
                  <Circle cx={activeX} cy={activeY} r={5} fill={lineColor} stroke={colors.surface} strokeWidth={2} />
                </>
              )}
            </Svg>
          )}
        </View>
      </GestureDetector>

      <View style={styles.axis}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{first !== undefined ? formatDate(first.date) : ''}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{last !== undefined ? formatDate(last.date) : ''}</Text>
      </View>
      {extremes !== null && (
        <Text style={[typography.caption, tabularNumbers, { color: colors.textMuted }]}>
          Low {formatNav(extremes.low.nav)} ({formatDate(extremes.low.date)}) · High {formatNav(extremes.high.nav)} (
          {formatDate(extremes.high.date)})
        </Text>
      )}
    </View>
  );
}

/** The static layer: re-renders only when the data or colour changes, not while scrubbing. */
const ChartPaths = memo(function ChartPaths({ geometry, color }: { geometry: ChartGeometry; color: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id="navArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.18} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={geometry.area} fill="url(#navArea)" />
      <Path d={geometry.line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
});

function lowAndHigh(points: readonly NavPoint[]): { low: NavPoint; high: NavPoint } | null {
  let low = points[0];
  let high = points[0];
  for (const point of points) {
    if (low === undefined || point.value < low.value) low = point;
    if (high === undefined || point.value > high.value) high = point;
  }
  return low !== undefined && high !== undefined ? { low, high } : null;
}

const styles = StyleSheet.create({
  readout: { minHeight: 44, justifyContent: 'center' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
