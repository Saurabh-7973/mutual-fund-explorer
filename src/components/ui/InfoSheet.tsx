import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface InfoSheetProps {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
}

/** A short explanation that slides up from the bottom and goes away with one tap. */
export function InfoSheet({ visible, title, body, onClose }: InfoSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.xl,
            paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md),
            gap: spacing.md,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText style={styles.body}>{body}</AppText>
        <Button label="Got it" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // A fixed dim over any theme: the sheet is the only lit surface.
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: -8 },
  body: { lineHeight: 23 },
});
