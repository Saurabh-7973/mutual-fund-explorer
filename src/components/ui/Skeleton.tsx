import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View, type DimensionValue } from 'react-native';

import { useTheme } from '@/theme/useTheme';

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
}

/** A placeholder block that pulses, or stays still when the user asks for reduced motion. */
export function Skeleton({ width = '100%', height, radius }: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius ?? theme.radius.sm,
        backgroundColor: theme.colors.surfaceMuted,
        opacity,
      }}
    />
  );
}

export interface SkeletonRowsProps {
  count?: number;
  /** The real row height, so the layout doesn't jump when data arrives. */
  rowHeight: number;
  /** Fund lists: a monogram and the rows in a white card. The NAV table has neither. */
  fundRows?: boolean;
}

export function SkeletonRows({ count = 6, rowHeight, fundRows = true }: SkeletonRowsProps) {
  const { colors, radius, spacing } = useTheme();
  // Shaped like the rows that replace it (a monogram, a name and a figure, in one white card),
  // so the list doesn't jump when the data arrives.
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      style={
        fundRows
          ? { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg }
          : { paddingHorizontal: spacing.lg }
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: rowHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {fundRows && <Skeleton width={40} height={40} radius={20} />}
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
          <View style={{ width: 72, gap: spacing.sm, alignItems: 'flex-end' }}>
            <Skeleton width={72} height={14} />
            <Skeleton width={48} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
