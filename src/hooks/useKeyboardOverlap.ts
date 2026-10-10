import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type View } from 'react-native';

/**
 * How many points of a view the on-screen keyboard covers. Android in SDK 57 is
 * edge-to-edge, so the keyboard draws over the screen instead of resizing it; a
 * view that centres its content uses this as bottom padding to centre in the
 * part the user can still see.
 */
export function useKeyboardOverlap() {
  const ref = useRef<View>(null);
  const [overlap, setOverlap] = useState(0);
  const keyboardTop = useRef<number | null>(null);

  const measure = useCallback(() => {
    const top = keyboardTop.current;
    if (top === null || ref.current === null) {
      setOverlap(0);
      return;
    }
    ref.current.measureInWindow((_x, y, _width, height) => {
      const next = Math.max(0, Math.round(y + height - top));
      setOverlap((current) => (current === next ? current : next));
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      setOverlap(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure]);

  // Re-measure when the view itself moves or resizes (onLayout), while the keyboard is up.
  return { ref, overlap, onLayout: measure };
}
