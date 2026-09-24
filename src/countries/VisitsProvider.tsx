import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { AccessibilityInfo } from 'react-native';

import {
  useVisitedCountries,
  type VisitedCountries,
} from '../hooks/useVisitedCountries';
import type { CountryId } from './types';
import type { VisitStorage } from './visit-storage';

const VisitsContext = createContext<VisitedCountries | null>(null);

export function VisitsProvider({
  storage,
  children,
}: {
  storage: VisitStorage;
  children: ReactNode;
}) {
  const { visitedIds, status, saveError, setVisited, retry } =
    useVisitedCountries(storage);
  const errorAnnouncement =
    status === 'load-error'
      ? 'Could not load your visits. Use Try again to retry.'
      : saveError
        ? 'Your latest changes haven’t been saved. Use Retry save to try again.'
        : null;
  // Tabs stay mounted: announce errors once here, not from each visible notice.
  useEffect(() => {
    if (errorAnnouncement) {
      AccessibilityInfo.announceForAccessibilityWithOptions(errorAnnouncement, {
        queue: true,
      });
    }
  }, [errorAnnouncement]);

  const changeVisit = useCallback(
    (id: CountryId, visited: boolean) => {
      if (status !== 'ready') return;
      setVisited(id, visited);
      void Haptics.selectionAsync().catch(() => undefined);
    },
    [setVisited, status],
  );
  const value = useMemo(
    () => ({
      visitedIds,
      status,
      saveError,
      setVisited: changeVisit,
      retry,
    }),
    [visitedIds, status, saveError, changeVisit, retry],
  );

  return (
    <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>
  );
}

export function useVisits() {
  const value = useContext(VisitsContext);
  if (!value) throw new Error('useVisits must be used within VisitsProvider.');
  return value;
}
