import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

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
