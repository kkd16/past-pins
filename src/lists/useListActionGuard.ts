import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

import type { TravelList } from '../data/model';

/** Invalidate native prompts when their screen or underlying lists change. */
export function useListActionGuard(lists: readonly TravelList[]) {
  const session = useRef<object | null>(null);
  useFocusEffect(
    useCallback(() => {
      session.current = { lists };
      return () => {
        session.current = null;
      };
    }, [lists]),
  );
  return () => {
    const current = session.current;
    return () => current !== null && session.current === current;
  };
}
