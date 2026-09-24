import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let pendingInitialRead = true;
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (value) => {
        pendingInitialRead = false;
        setEnabled(value);
      },
    );
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (pendingInitialRead) setEnabled(value);
      })
      .catch(() => undefined);
    return () => {
      pendingInitialRead = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
