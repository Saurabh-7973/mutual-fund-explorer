import { useMemo } from 'react';
import { View } from 'react-native';

import { describeScheme } from '@/domain/schemeName';
import type { SchemeMeta } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { SchemeBadges } from '../search/SchemeBadges';
import { AppText } from '../ui/AppText';

export interface FundTitleProps {
  name: string;
  schemeCode: number;
  meta?: SchemeMeta;
  /** Compact form for the NAV list: title and badges only. */
  compact?: boolean;
}

export function FundTitle({ name, schemeCode, meta, compact = false }: FundTitleProps) {
  const { spacing } = useTheme();
  const { title, variant } = useMemo(() => describeScheme(name), [name]);
  const houseLine = [meta?.fundHouse, meta?.schemeCategory].filter((part): part is string => !!part).join(' · ');
  const idLine = [
    `Code ${schemeCode}`,
    meta?.isinGrowth ? `ISIN ${meta.isinGrowth}` : null,
    meta?.isinDivReinvestment ? `IDCW ISIN ${meta.isinDivReinvestment}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant={compact ? 'heading' : 'title'} accessibilityRole="header">
        {title}
      </AppText>
      {!compact && variant !== '' && <AppText tone="muted">{variant}</AppText>}
      <SchemeBadges name={name} />
      {!compact && houseLine !== '' && (
        <AppText variant="label" tone="muted">
          {houseLine}
        </AppText>
      )}
      {!compact && (
        <AppText variant="caption" tone="muted" numeric selectable>
          {idLine}
        </AppText>
      )}
    </View>
  );
}
