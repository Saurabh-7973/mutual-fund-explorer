import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MIN_TOUCH, motion } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { haptic } from './haptics';

export interface SegmentedOption<K extends string> {
  key: K;
  label: string;
  disabled?: boolean;
}

export interface SegmentedRowProps<K extends string> {
  options: readonly SegmentedOption<K>[];
  selected: K;
  onSelect: (key: K) => void;
  /** Read before each option, e.g. "Chart range". */
  accessibilityLabel: string;
  /**
   * 'track' (a mode switch: two or three choices that change what the screen shows): a
   * recessed track with a raised thumb. 'plain' (a picker among many, like chart ranges):
   * text only, with a soft pill on the choice.
   */
  variant?: 'track' | 'plain';
}

const TRACK_INSET = 3;

/**
 * Equal-width options with one marker that slides to the choice, so the eye follows the
 * change instead of seeing one pill vanish and another appear. The slide is skipped when
 * the system asks for reduced motion, and on first layout.
 */
export function SegmentedRow<K extends string>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
  variant = 'plain',
}: SegmentedRowProps<K>) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const track = variant === 'track';
  const inset = track ? TRACK_INSET : 0;
  const cell = width > 0 ? (width - 2 * inset) / options.length : 0;
  const index = Math.max(0, options.findIndex((option) => option.key === selected));

  useEffect(() => {
    if (cell === 0) return;
    const to = index * cell;
    if (reduced || !placed.current) {
      x.setValue(to);
      placed.current = true;
      return;
    }
    const animation = Animated.timing(x, {
      toValue: to,
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [cell, index, reduced, x]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  };

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.row,
        track && {
          padding: inset,
          borderRadius: radius.sm + inset,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      {cell > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            track ? styles.thumbTrack : styles.thumbPlain,
            {
              left: inset,
              top: inset,
              bottom: inset,
              width: cell,
              transform: [{ translateX: x }],
            },
            track
              ? {
                  borderRadius: radius.sm,
                  backgroundColor: colors.raised,
                  shadowColor: colors.shadow,
                }
              : { borderRadius: radius.control, backgroundColor: colors.primarySoft },
          ]}
        />
      )}
      {options.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => {
              if (option.key !== selected) haptic.tick();
              onSelect(option.key);
            }}
            disabled={option.disabled}
            accessibilityRole="tab"
            accessibilityLabel={`${accessibilityLabel}: ${option.label}`}
            accessibilityState={{ selected: isSelected, disabled: option.disabled }}
            style={[styles.cell, track && styles.cellTrack]}
          >
            <AppText
              variant="labelStrong"
              tone={isSelected ? (track ? 'default' : 'primary') : 'muted'}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              style={option.disabled && styles.disabled}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cellTrack: { minHeight: MIN_TOUCH - 2 * TRACK_INSET },
  // The plain pill sits inside its cell, not edge to edge, so neighbouring ranges stay apart.
  // 36 tall inside a 44 cell.
  thumbPlain: { position: 'absolute', marginVertical: 4 },
  thumbTrack: {
    position: 'absolute',
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  disabled: { opacity: 0.35 },
});
