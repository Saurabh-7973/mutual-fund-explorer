import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        {
          // White on the warm page: no border, no shadow. Lines appear only inside, as inset hairlines.
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
