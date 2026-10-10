import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { clampDate, formatDate, fromLocalDate, toLocalDate } from '@/domain/dates';
import type { IsoDate } from '@/domain/types';
import { MIN_TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * A calendar-date field. Android opens the system dialog; iOS shows an inline
 * calendar under the field. Values are "YYYY-MM-DD" strings: the picker's Date
 * objects are converted at the edge with toLocalDate/fromLocalDate, so time
 * zones never shift the chosen day.
 *
 * Uses the datetimepicker 9 API: onValueChange and onDismiss (onChange is deprecated).
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
  const [iosOpen, setIosOpen] = useState(false);

  const shown = clampDate(value ?? maximumDate, minimumDate, maximumDate);
  const min = minimumDate !== null ? toLocalDate(minimumDate) : undefined;
  const max = toLocalDate(maximumDate);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toLocalDate(shown),
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        onValueChange: (_event, date) => onChange(fromLocalDate(date)),
      });
    } else {
      setIosOpen((isOpen) => !isOpen);
    }
  };

  const messageColor =
    message?.tone === 'error' ? colors.danger : message?.tone === 'warning' ? colors.warning : colors.textMuted;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value !== null ? formatDate(value) : placeholder}`}
        accessibilityHint="Opens a calendar"
        accessibilityState={{ disabled, expanded: Platform.OS === 'ios' ? iosOpen : undefined }}
        disabled={disabled}
        onPress={open}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: message?.tone === 'error' ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[typography.body, { color: value !== null ? colors.text : colors.textMuted }]}>
          {value !== null ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </Pressable>

      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={toLocalDate(shown)}
          mode="date"
          display="inline"
          minimumDate={min}
          maximumDate={max}
          onValueChange={(_event, date) => {
            onChange(fromLocalDate(date));
            setIosOpen(false);
          }}
          onDismiss={() => setIosOpen(false)}
        />
      )}

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
    minHeight: MIN_TOUCH,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
