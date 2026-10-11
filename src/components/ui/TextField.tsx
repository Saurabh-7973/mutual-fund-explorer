import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** The value is invalid and its message is shown: a red edge. */
  error?: boolean;
  /** Inside a white card: a grey fill so the field still reads as a field. */
  onSurface?: boolean;
}

/**
 * A text input in the app's look: a white field on the page with no outline at rest, a
 * green edge while it has focus, a red one when its value is invalid. One shape for every
 * form, matching the search field.
 */
export function TextField({ error = false, onSurface = false, onFocus, onBlur, multiline, ...rest }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...rest}
      multiline={multiline}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      placeholderTextColor={colors.textMuted}
      style={[
        typography.body,
        styles.field,
        multiline && styles.multiline,
        {
          color: colors.text,
          backgroundColor: onSurface ? colors.surfaceMuted : colors.surface,
          borderColor: error ? colors.danger : focused ? colors.primary : 'transparent',
          borderRadius: radius.control,
          paddingHorizontal: spacing.lg,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 52, borderWidth: 1.5 },
  multiline: { minHeight: 120, maxHeight: 220, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
});
