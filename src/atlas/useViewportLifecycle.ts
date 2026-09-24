import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useReducedMotion } from '../motion/ReducedMotion';

export function useViewportLifecycle(controller: {
  setActive: (active: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
}) {
  const reducedMotion = useReducedMotion();
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
    controller.setReduceMotion(reducedMotion);
  }, [controller, reducedMotion]);
}
