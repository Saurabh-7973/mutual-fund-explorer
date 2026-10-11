import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '@/domain/dates';
import type { IsoDate } from '@/domain/types';
import { useTheme } from '@/theme/useTheme';

import { CalendarSheet } from './CalendarSheet';

/**
 * A calendar-date field. Opens the app's own CalendarSheet on both platforms, so the
 * picker matches the app instead of the system dialog's colours. Values are
 * "YYYY-MM-DD" strings throughout; no Date objects are involved, so time zones can
 * never shift the chosen day.
 */

export interface DateFieldProps {
  label: string;
  value: IsoDate | null;
  onChange: (date: IsoDate) => void;
  /** Earliest selectable date (the earliest NAV in the data); null for no lower bound. */
  minimumDate: IsoDate | null;
  /** Latest selectable date (today in India). */
  maximumDate: IsoDate;
  placeholder?: string;
  disabled?: boolean;
  /** Shown under the field; tone decides the colour. */
  message?: { tone: 'error' | 'warning' | 'info'; text: string } | null;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Select a date',
  disabled = false,
  message = null,
}: DateFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [open, setOpen] = useState(false);

  const messageColor =
    message?.tone === 'error' ? colors.danger : message?.tone === 'warning' ? colors.warning : colors.textMuted;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value !== null ? formatDate(value) : placeholder}`}
        accessibilityHint="Opens a calendar"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            // Same shape as the text fields: no outline at rest, green while its calendar is open, red when invalid.
            borderColor: message?.tone === 'error' ? colors.danger : open ? colors.primary : 'transparent',
            backgroundColor: colors.surface,
            borderRadius: radius.control,
            paddingHorizontal: spacing.lg,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[typography.body, { color: value !== null ? colors.text : colors.textMuted }]}>
          {value !== null ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </Pressable>

      <CalendarSheet
        visible={open}
        title={label}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />

      {message !== null && (
        <Text style={[typography.caption, { color: messageColor }]} accessibilityLiveRegion="polite">
          {message.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
