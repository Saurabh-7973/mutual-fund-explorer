import { useMemo } from 'react';
import { View } from 'react-native';

import { describeScheme, optionFromIsins } from '@/domain/schemeName';
import { useTheme } from '@/theme/useTheme';

import { Badge } from '../ui/Badge';

export interface SchemeBadgesProps {
  name: string;
  size?: 'sm' | 'md';
  /** The scheme's ISINs, when loaded: they fill in Growth or IDCW for names that don't say. */
  isins?: { growth: string | null; idcw: string | null };
}

/** Plan and option parsed from the scheme name; unknown parts show nothing rather than a guess. */
export function SchemeBadges({ name, size = 'md', isins }: SchemeBadgesProps) {
  const { spacing } = useTheme();
  const { plan, option: named } = useMemo(() => describeScheme(name), [name]);
  const option = named ?? (isins !== undefined ? optionFromIsins(isins.growth, isins.idcw) : null);
  if (plan === null && option === null) return null;
  return (
    <View style={{ flexDirection: 'row', gap: size === 'sm' ? spacing.xs : spacing.sm }}>
      {plan !== null && <Badge label={plan} tone={plan === 'Direct' ? 'info' : 'neutral'} />}
      {option !== null && <Badge label={option} tone="neutral" />}
    </View>
  );
}
