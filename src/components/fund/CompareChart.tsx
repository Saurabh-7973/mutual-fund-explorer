import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { GROWTH_BASE, type GrowthComparison } from '@/domain/compare';
import { formatDate } from '@/domain/dates';
import { formatInr } from '@/domain/format';
import { lttbIndices } from '@/domain/lttb';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

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
 * are never the only way to tell the funds apart.
 */
export function CompareChart({ growth, labelA, labelB }: CompareChartProps) {
  const { colors, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);
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
    };
  }, [growth, width]);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <LegendRow colour={colourA} label={labelA} value={formatInr(growth.endA, 2)} />
        <LegendRow colour={colourB} label={labelB} value={formatInr(growth.endB, 2)} />
      </View>
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
          </Svg>
        )}
      </View>
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
});
