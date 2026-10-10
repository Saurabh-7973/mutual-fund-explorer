import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export interface SectionProps {
  title: string;
  /**
   * The section's one-line takeaway, shown while it is closed, so a collapsed page still
   * answers the question each section is about.
   */
  summary?: ReactNode;
  initiallyOpen?: boolean;
  children: ReactNode;
}

/** A titled block that opens on tap: detail stays one tap away instead of all on screen at once. */
export function Section({ title, summary, initiallyOpen = false, children }: SectionProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? 'Collapses this section' : 'Expands this section'}
        style={({ pressed }) => [
          styles.header,
          { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.flex, { gap: 2 }]}>
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          {!open && summary !== undefined && summary}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>
      {open && <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH },
  flex: { flex: 1 },
});
