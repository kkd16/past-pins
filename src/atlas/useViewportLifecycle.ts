import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useReducedMotion } from '../motion/ReducedMotion';

export function useViewportLifecycle(
  controller: {
    setActive: (active: boolean) => void;
    setReduceMotion: (enabled: boolean) => void;
  },
  enabled: boolean,
) {
  const reducedMotion = useReducedMotion();
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      controller.setActive(AppState.currentState === 'active');
      const subscription = AppState.addEventListener('change', (state) =>
        controller.setActive(state === 'active'),
      );
      return () => {
        subscription.remove();
        controller.setActive(false);
      };
    }, [controller, enabled]),
  );
  useEffect(() => {
    controller.setReduceMotion(reducedMotion);
  }, [controller, reducedMotion]);
}
