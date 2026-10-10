import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { describeScheme } from '@/domain/schemeName';
import type { SchemeSearchResult } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { SchemeBadges } from './SchemeBadges';
import { WatchToggle } from './WatchToggle';

export const SCHEME_ROW_HEIGHT = 76;

export interface SchemeRowProps {
  scheme: SchemeSearchResult;
}

/** One search result. The star sits beside the pressable area, so tapping it never opens the fund. */
export const SchemeRow = memo(function SchemeRow({ scheme }: SchemeRowProps) {
  const { colors, spacing } = useTheme();
  const { schemeCode, schemeName } = scheme;
  const title = useMemo(() => describeScheme(schemeName).title, [schemeName]);

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, paddingLeft: spacing.lg, paddingRight: spacing.md, gap: spacing.sm },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the fund"
        onPress={() =>
          router.push({ pathname: '/fund/[code]', params: { code: String(schemeCode), name: schemeName } })
        }
        style={({ pressed }) => [styles.main, { gap: spacing.xs, opacity: pressed ? 0.6 : 1 }]}
      >
        <AppText variant="label" numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.title}>
          {title}
        </AppText>
        <View style={[styles.meta, { gap: spacing.sm }]}>
          <SchemeBadges name={schemeName} size="sm" />
          <AppText variant="caption" tone="muted" numeric maxFontSizeMultiplier={1.3}>
            Code {schemeCode}
          </AppText>
        </View>
      </Pressable>
      <WatchToggle schemeCode={schemeCode} schemeName={schemeName} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    height: SCHEME_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  main: { flex: 1, justifyContent: 'center' },
  title: { fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
