import { useCallback } from 'react';

import { describeScheme } from '@/domain/schemeName';
import { usePortfolioStore } from '@/store/portfolioStore';
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

  const toggle = useCallback(() => {
    haptic.tap();
    if (watched) unwatch(schemeCode);
    else watch({ schemeCode, schemeName });
  }, [watched, watch, unwatch, schemeCode, schemeName]);

  return (
    <IconButton
      name={watched ? 'star' : 'star-outline'}
      color={watched ? colors.star : colors.textMuted}
      onPress={toggle}
      selected={watched}
      accessibilityLabel={watched ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
    />
  );
}
