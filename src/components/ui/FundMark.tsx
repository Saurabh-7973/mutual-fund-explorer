import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { fundHouseOf } from '@/domain/fundHouse';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export const FUND_MARK_SIZE = 40;

/**
 * The fund house as a monogram in its own colour: what a logo does in Groww's lists (mfapi.in
 * has no logos). Decorative for screen readers, since the fund's name is read beside it.
 */
export const FundMark = memo(function FundMark({ schemeName, size = FUND_MARK_SIZE }: { schemeName: string; size?: number }) {
  const { colors } = useTheme();
  const house = useMemo(() => fundHouseOf(schemeName), [schemeName]);
  const [background, letters] = colors.mark[house.tone] ?? colors.mark[0] ?? [colors.surfaceMuted, colors.text];
  const long = house.monogram.length > 2;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: background }]}
    >
      <AppText
        variant="labelStrong"
        maxFontSizeMultiplier={1}
        style={{ color: letters, fontSize: size * (long ? 0.3 : 0.36), lineHeight: size * 0.5, letterSpacing: long ? -0.3 : 0 }}
      >
        {house.monogram}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
});
