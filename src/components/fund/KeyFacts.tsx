import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import type { NavPoint, SchemeMeta } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';

/** Four facts in a grid, label above value: scannable without reading sentences. */
export function KeyFacts({ meta, first, skipped }: { meta: SchemeMeta; first: NavPoint; skipped: number }) {
  const { colors, spacing } = useTheme();
  const facts = [
    // The NAV and its date head the page; here, the identifier statements and platforms use.
    { label: 'ISIN', value: meta.isinGrowth ?? meta.isinDivReinvestment ?? '—' },
    { label: 'Fund house', value: meta.fundHouse ?? '—' },
    { label: 'NAV data since', value: formatDate(first.date) },
    { label: 'Scheme code', value: String(meta.schemeCode) },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.grid, { borderColor: colors.border }]}>
        {facts.map((fact) => (
          <View key={fact.label} style={[styles.cell, { paddingVertical: spacing.sm, gap: 2 }]}>
            {/* Capped like the glossary labels elsewhere on the page, so labels stay one size. */}
            <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
              {fact.label}
            </AppText>
            {/* Wraps rather than truncates: with selectable, Android clips a one-line value at large text sizes. */}
            <AppText variant="label" numeric selectable>
              {fact.value}
            </AppText>
          </View>
        ))}
      </View>
      {skipped > 0 && (
        <AppText variant="caption" tone="muted">
          {skipped} malformed or duplicate rows in the source data were skipped.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth },
  cell: { width: '50%' },
});
