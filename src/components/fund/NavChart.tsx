import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { buildChartGeometry, chartSummary, nearestIndex, type ChartGeometry } from '@/domain/chart';
import { formatDate } from '@/domain/dates';
import { formatNav, formatNavChange, formatPercentHundredths } from '@/domain/format';
import { navChange } from '@/domain/nav';
import type { NavPoint } from '@/domain/types';
import { fonts, tabularNumbers } from '@/theme/tokens';
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
// Room above and below the line for the High and Low labels drawn on the chart.
const PADDING = { padTop: 24, padBottom: 22, padX: 2 };

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
  const markers = useMemo(
    () => (geometry !== null && extremes !== null ? placeExtremes(geometry, extremes, height) : null),
    [geometry, extremes, height],
  );

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
  const activeChange = active !== undefined && first !== undefined ? navChange(first, active) : null;

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Fixed height, so the chart doesn't jump when scrubbing swaps the change for a date's NAV. */}
      <View style={styles.readout}>
        {active !== undefined ? (
          <>
            <Text style={[typography.label, tabularNumbers, { color: colors.text }]}>
              {formatNav(active.nav)}
              <Text style={{ color: colors.textMuted }}> NAV on {formatDate(active.date)}</Text>
            </Text>
            {activeChange !== null && first !== undefined && (
              <Text style={[typography.caption, tabularNumbers, { color: colors.textMuted }]}>
                {formatPercentHundredths(activeChange.pctHundredths)} from {formatDate(first.date)}
              </Text>
            )}
          </>
        ) : change !== null ? (
          <>
            <Text style={[typography.label, tabularNumbers, { color: lineColor }]}>
              {formatNavChange(change.diff)} ({formatPercentHundredths(change.pctHundredths)})
              <Text style={{ color: colors.textMuted }}> over {rangeLabel}, absolute</Text>
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Drag across the chart to read any date</Text>
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
              {markers !== null && active === undefined && (
                <>
                  <Marker
                    x={markers.high.x}
                    y={markers.high.y}
                    label={`High ${formatNav(markers.high.point.nav)}`}
                    above
                    width={width}
                  />
                  <Marker
                    x={markers.low.x}
                    y={markers.low.y}
                    label={`Low ${formatNav(markers.low.point.nav)}`}
                    width={width}
                  />
                </>
              )}
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

interface Placed {
  point: NavPoint;
  x: number;
  y: number;
}

/** Where the exact low and high (from the full range) fall on the drawn, downsampled line. */
function placeExtremes(
  geometry: ChartGeometry,
  extremes: { low: NavPoint; high: NavPoint },
  height: number,
): { low: Placed; high: Placed } | null {
  const span = geometry.maxValue - geometry.minValue;
  const place = (point: NavPoint): Placed | null => {
    const index = geometry.points.findIndex((drawn) => drawn.date >= point.date);
    const x = geometry.xs[index === -1 ? geometry.xs.length - 1 : index];
    if (x === undefined) return null;
    const fraction = span > 0 ? (point.value - geometry.minValue) / span : 0.5;
    const y = PADDING.padTop + (1 - fraction) * (height - PADDING.padTop - PADDING.padBottom);
    return { point, x, y: Math.min(height - 2, Math.max(2, y)) };
  };
  const low = place(extremes.low);
  const high = place(extremes.high);
  return low !== null && high !== null ? { low, high } : null;
}

/** A small dot on an extreme with its label above (high) or below (low), kept inside the chart. */
function Marker({
  x,
  y,
  label,
  above = false,
  width,
}: {
  x: number;
  y: number;
  label: string;
  above?: boolean;
  width: number;
}) {
  const { colors } = useTheme();
  const anchor = x < width * 0.2 ? 'start' : x > width * 0.8 ? 'end' : 'middle';
  return (
    <>
      <Circle cx={x} cy={y} r={3} fill={colors.textMuted} />
      <SvgText
        x={x}
        y={above ? y - 8 : y + 16}
        fontSize={11}
        fontFamily={fonts.medium}
        fill={colors.textMuted}
        textAnchor={anchor}
      >
        {label}
      </SvgText>
    </>
  );
}

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
