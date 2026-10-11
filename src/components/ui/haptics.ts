import * as Haptics from 'expo-haptics';

/**
 * The app's four kinds of touch feedback, so every screen feels the same:
 *  - tick: moving between choices (a selector, a chart date, a sort option)
 *  - tap: a toggle that changes state (star, eye, a section opening)
 *  - done: something saved or removed for good
 *  - warn: Save pressed on an invalid form, or a confirmation before something can't be undone
 * The system's own haptics setting still applies; failures (no motor) are ignored.
 */
export const haptic = {
  tick: () => void Haptics.selectionAsync().catch(() => undefined),
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  done: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warn: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
