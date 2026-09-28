import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

export function useActionGuard(scope?: unknown) {
  const session = useRef<object | null>(null);
  useFocusEffect(
    useCallback(() => {
      session.current = { scope };
      return () => {
        session.current = null;
      };
    }, [scope]),
  );
  return useCallback(() => {
    const current = session.current;
    return () => current !== null && session.current === current;
  }, []);
}
