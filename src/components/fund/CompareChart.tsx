import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { scrubTickKey } from '@/domain/chart';
import { GROWTH_BASE, growthAt, type GrowthComparison } from '@/domain/compare';
import { formatDate } from '@/domain/dates';
import { formatInr } from '@/domain/format';
import { lttbIndices } from '@/domain/lttb';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { haptic } from '../ui/haptics';

const HEIGHT = 180;
const MAX_POINTS = 150;
const PAD_Y = 8;
/** SVG coordinates to one decimal: enough for a phone screen, shorter path strings. */
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface CompareChartProps {
  growth: GrowthComparison;
  labelA: string;
  labelB: string;
}

/**
 * Growth of ₹10,000 in two funds on one axis, with the starting ₹10,000 as a dashed
 * baseline. Each line is named in the legend with what the money became, so the colours
 * are never the only way to tell the funds apart. Drag across the chart (as on the NAV
 * chart) to read both values on any date; the legend shows them exactly.
 */
export function CompareChart({ growth, labelA, labelB }: CompareChartProps) {
  const { colors, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);
  const [active, setActive] = useState<number | null>(null);
  const colourA = colors.chart[0];
  const colourB = colors.chart[1];

  const paths = useMemo(() => {
    if (width === 0) return null;
    const pts = growth.points;
    const xs = pts.map((_, i) => i);
    // Keep the shape of both lines: indices chosen on A, plus those chosen on B.
    const idx = new Set([
      ...lttbIndices(xs, pts.map((p) => p.a), MAX_POINTS),
      ...lttbIndices(xs, pts.map((p) => p.b), MAX_POINTS),
    ]);
    const keep = [...idx].sort((m, n) => m - n);
    const values = keep.flatMap((i) => [pts[i]?.a ?? GROWTH_BASE, pts[i]?.b ?? GROWTH_BASE]);
    const min = Math.min(GROWTH_BASE, ...values);
    const max = Math.max(GROWTH_BASE, ...values);
    const span = max - min || 1;
    const x = (i: number) => (i / Math.max(1, pts.length - 1)) * width;
    const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (HEIGHT - 2 * PAD_Y);
    const line = (pick: (i: number) => number) =>
      keep.map((i, k) => `${k === 0 ? 'M' : 'L'}${round1(x(i))},${round1(y(pick(i)))}`).join(' ');
    return {
      a: line((i) => pts[i]?.a ?? GROWTH_BASE),
      b: line((i) => pts[i]?.b ?? GROWTH_BASE),
      base: y(GROWTH_BASE),
      x,
      y,
    };
  }, [growth, width]);

  const count = growth.points.length;
  const lastTick = useRef<string | null>(null);
  const scrubTo = useCallback(
    (px: number) => {
      if (width === 0) return;
      const index = Math.min(count - 1, Math.max(0, Math.round((px / width) * (count - 1))));
      // One tick per step (a point over short spans, a month over long ones), like the NAV chart.
      const point = growth.points[index];
      const first = growth.points[0];
      const last = growth.points[count - 1];
      if (point !== undefined && first !== undefined && last !== undefined) {
        const key = scrubTickKey(point.date, first.date, last.date);
        if (key !== lastTick.current) {
          lastTick.current = key;
          haptic.tick();
        }
      }
      setActive(index);
    },
    [width, count, growth.points],
  );
  const release = useCallback(() => {
    lastTick.current = null;
    setActive(null);
  }, []);
  const gesture = useMemo(() => {
    // Same feel as the NAV chart: a horizontal drag scrubs, a vertical swipe scrolls the page.
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-6, 6])
      .failOffsetY([-10, 10])
      .onStart((event) => scrubTo(event.x))
      .onUpdate((event) => scrubTo(event.x))
      .onFinalize(release);
    const hold = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(250)
      .onStart((event) => scrubTo(event.x))
      .onUpdate((event) => scrubTo(event.x))
      .onFinalize(release);
    return Gesture.Race(drag, hold);
  }, [scrubTo, release]);

  const activePoint = active === null ? null : growth.points[active];
  const activeValues = active === null ? null : growthAt(growth, active);
  const valueA = activeValues?.a ?? growth.endA;
  const valueB = activeValues?.b ?? growth.endB;
  const shownDate = activePoint?.date ?? growth.end;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" tone="muted" numeric>
          {active === null ? `Value on ${formatDate(shownDate)}` : `On ${formatDate(shownDate)}`}
        </AppText>
        <LegendRow colour={colourA} label={labelA} value={formatInr(valueA, 2)} />
        <LegendRow colour={colourB} label={labelB} value={formatInr(valueB, 2)} />
      </View>
      <GestureDetector gesture={gesture}>
        <View
          onLayout={onLayout}
          style={{ height: HEIGHT }}
          accessible
          accessibilityLabel={`₹10,000 on ${formatDate(growth.start)} became ${formatInr(growth.endA, 2)} in ${labelA} and ${formatInr(growth.endB, 2)} in ${labelB} by ${formatDate(growth.end)}`}
        >
          {paths !== null && (
            <Svg width={width} height={HEIGHT}>
              <Line x1={0} x2={width} y1={paths.base} y2={paths.base} stroke={colors.border} strokeDasharray="4 4" strokeWidth={1} />
              <Path d={paths.b} stroke={colourB} strokeWidth={2} fill="none" strokeLinejoin="round" />
              <Path d={paths.a} stroke={colourA} strokeWidth={2} fill="none" strokeLinejoin="round" />
              {active !== null && activePoint && (
                <>
                  <Line x1={paths.x(active)} x2={paths.x(active)} y1={0} y2={HEIGHT} stroke={colors.textMuted} strokeWidth={1} />
                  <Circle cx={paths.x(active)} cy={paths.y(activePoint.b)} r={4} fill={colourB} stroke={colors.surface} strokeWidth={2} />
                  <Circle cx={paths.x(active)} cy={paths.y(activePoint.a)} r={4} fill={colourA} stroke={colors.surface} strokeWidth={2} />
                </>
              )}
            </Svg>
          )}
          {paths !== null && (
            <AppText
              variant="caption"
              tone="muted"
              numeric
              style={[styles.baseLabel, { top: paths.base > 20 ? paths.base - 18 : paths.base + 2 }]}
            >
              ₹10,000
            </AppText>
          )}
        </View>
      </GestureDetector>
      <View style={styles.axis}>
        <AppText variant="caption" tone="muted">
          {formatDate(growth.start)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {formatDate(growth.end)}
        </AppText>
      </View>
    </View>
  );
}

function LegendRow({ colour, label, value }: { colour: string; label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.legend, { gap: spacing.sm }]}>
      <View style={[styles.swatch, { backgroundColor: colour }]} />
      <AppText variant="label" numberOfLines={1} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="labelStrong" numeric>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 12, height: 3, borderRadius: 2 },
  flex: { flex: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  baseLabel: { position: 'absolute', right: 0 },
});
