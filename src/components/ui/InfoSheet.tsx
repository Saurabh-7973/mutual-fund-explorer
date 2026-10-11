import { StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export interface InfoSheetProps {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
}

/** A short explanation that rises from the bottom and goes away with one tap. */
export function InfoSheet({ visible, title, body, onClose }: InfoSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <AppText style={styles.body}>{body}</AppText>
      <Button label="Got it" variant="secondary" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 23 },
});
