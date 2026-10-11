import { useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { describeScheme } from '@/domain/schemeName';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { usePortfolioStore } from '@/store/portfolioStore';
import { motion } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { IconButton } from '../ui/IconButton';
import { haptic } from '../ui/haptics';

export interface WatchToggleProps {
  schemeCode: number;
  schemeName: string;
}

/** Star that adds or removes a scheme from the watchlist. */
export function WatchToggle({ schemeCode, schemeName }: WatchToggleProps) {
  const { colors } = useTheme();
  const watched = usePortfolioStore((s) => s.watchlist.some((item) => item.schemeCode === schemeCode));
  const watch = usePortfolioStore((s) => s.watch);
  const unwatch = usePortfolioStore((s) => s.unwatch);
  const title = describeScheme(schemeName).title;
  const reduced = useReducedMotion();
  // Starring pops the star (1 → 1.2 → 1) so the change is seen as well as felt; unstarring just swaps it.
  const scale = useRef(new Animated.Value(1)).current;

  const toggle = useCallback(() => {
    haptic.tap();
    if (watched) {
      unwatch(schemeCode);
      return;
    }
    watch({ schemeCode, schemeName });
    if (!reduced) {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: motion.fast / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: motion.fast, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      ]).start();
    }
  }, [watched, watch, unwatch, schemeCode, schemeName, reduced, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <IconButton
        name={watched ? 'star' : 'star-outline'}
        color={watched ? colors.star : colors.textMuted}
        onPress={toggle}
        selected={watched}
        accessibilityLabel={watched ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
      />
    </Animated.View>
  );
}
