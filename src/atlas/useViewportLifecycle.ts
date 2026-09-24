import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export function useViewportLifecycle(controller: {
  setActive: (active: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
}) {
  useFocusEffect(
    useCallback(() => {
      controller.setActive(AppState.currentState === 'active');
      const subscription = AppState.addEventListener('change', (state) =>
        controller.setActive(state === 'active'),
      );
      return () => {
        subscription.remove();
        controller.setActive(false);
      };
    }, [controller]),
  );
  useEffect(() => {
    let pendingInitialRead = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        pendingInitialRead = false;
        controller.setReduceMotion(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (pendingInitialRead) controller.setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      pendingInitialRead = false;
      subscription.remove();
    };
  }, [controller]);
}
