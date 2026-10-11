import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import { formatNav } from '@/domain/format';
import type { NavPoint, SchemeMeta } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Term } from '../ui/Term';

/** Four facts in a grid, label above value: scannable without reading sentences. */
export function KeyFacts({ meta, last, first, skipped }: { meta: SchemeMeta; last: NavPoint; first: NavPoint; skipped: number }) {
  const { colors, spacing } = useTheme();
  const facts = [
    { label: `NAV · ${formatDate(last.date)}`, value: formatNav(last.nav), term: 'nav' as const },
    { label: 'Fund house', value: meta.fundHouse ?? '—' },
    { label: 'NAV data since', value: formatDate(first.date) },
    { label: 'Scheme code', value: String(meta.schemeCode) },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.grid, { borderColor: colors.border }]}>
        {facts.map((fact) => (
          <View key={fact.label} style={[styles.cell, { paddingVertical: spacing.sm, gap: 2 }]}>
            {'term' in fact && fact.term !== undefined ? (
              <Term term={fact.term} label={fact.label} variant="caption" />
            ) : (
              // Capped like the glossary labels beside it, so the four labels stay one size.
              <AppText variant="caption" tone="muted" maxFontSizeMultiplier={1.3}>
                {fact.label}
              </AppText>
            )}
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
