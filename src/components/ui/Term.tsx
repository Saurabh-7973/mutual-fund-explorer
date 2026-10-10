import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { GLOSSARY, type GlossaryKey } from '@/domain/glossary';
import { useTheme } from '@/theme/useTheme';

import { AppText, type TextTone, type TextVariant } from './AppText';
import { InfoSheet } from './InfoSheet';

export interface TermProps {
  /** Which glossary entry explains this label. */
  term: GlossaryKey;
  /** The text shown; defaults to the entry's title. */
  label?: string;
  variant?: TextVariant;
  tone?: TextTone;
}

/**
 * A label with a small ⓘ that opens a plain explanation. Beginners get help where the
 * word appears; everyone else can ignore a 14-point icon.
 */
export function Term({ term, label, variant = 'label', tone = 'muted' }: TermProps) {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[term];
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? entry.title}. What does this mean?`}
        style={[styles.row, { gap: spacing.xs }]}
      >
        <AppText variant={variant} tone={tone} maxFontSizeMultiplier={1.3}>
          {label ?? entry.title}
        </AppText>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
      </Pressable>
      <InfoSheet visible={open} title={entry.title} body={entry.body} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
