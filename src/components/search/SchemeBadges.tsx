import { useMemo } from 'react';
import { View } from 'react-native';

import { describeScheme } from '@/domain/schemeName';
import { useTheme } from '@/theme/useTheme';

import { Badge } from '../ui/Badge';

export interface SchemeBadgesProps {
  name: string;
  size?: 'sm' | 'md';
}

/** Plan and option parsed from the scheme name; unknown parts show nothing rather than a guess. */
export function SchemeBadges({ name, size = 'md' }: SchemeBadgesProps) {
  const { spacing } = useTheme();
  const { plan, option } = useMemo(() => describeScheme(name), [name]);
  if (plan === null && option === null) return null;
  return (
    <View style={{ flexDirection: 'row', gap: size === 'sm' ? spacing.xs : spacing.sm }}>
      {plan !== null && <Badge label={plan} tone={plan === 'Direct' ? 'info' : 'neutral'} />}
      {option !== null && <Badge label={option} tone="neutral" />}
    </View>
  );
}
