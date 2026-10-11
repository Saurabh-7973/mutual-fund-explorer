import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import type { NavPoint, SchemeMeta } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';

/** Four facts in a card, two by two, label above value: scannable without reading sentences. */
export function KeyFacts({ meta, first, skipped }: { meta: SchemeMeta; first: NavPoint; skipped: number }) {
  const { colors, spacing } = useTheme();
  // The NAV and its date head the page; here, the identifiers statements and platforms use.
  const facts = [
    { label: 'Fund house', value: meta.fundHouse ?? '—' },
    { label: 'Scheme code', value: String(meta.schemeCode) },
    { label: 'ISIN', value: meta.isinGrowth ?? meta.isinDivReinvestment ?? '—' },
    { label: 'NAV data since', value: formatDate(first.date) },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ paddingVertical: spacing.xs }}>
        <View style={styles.grid}>
          {facts.map((fact, i) => (
            <View
              key={fact.label}
              style={[
                styles.cell,
                { paddingVertical: spacing.md, gap: 4, paddingRight: i % 2 === 0 ? spacing.md : 0, paddingLeft: i % 2 === 1 ? spacing.md : 0 },
                // An inset hairline between the two rows only.
                i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
              ]}
            >
              {/* Capped like the glossary labels elsewhere on the page, so labels stay one size. */}
              <AppText variant="label" tone="muted" maxFontSizeMultiplier={1.3}>
                {fact.label}
              </AppText>
              {/* Wraps rather than truncates: with selectable, Android clips a one-line value at large text sizes. */}
              <AppText variant="rowTitle" numeric selectable>
                {fact.value}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      {skipped > 0 && (
        <AppText variant="caption" tone="muted">
          {skipped} malformed or duplicate rows in the source data were skipped.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%' },
});
