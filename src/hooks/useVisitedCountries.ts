import { useCallback, useEffect, useRef, useState } from 'react';

import { countryIds } from '../countries/catalog';
import { InvalidVisitsError, type VisitStorage } from '../countries/visit-storage';
import type { CountryId } from '../countries/types';

type LoadState =
  | { status: 'loading' | 'ready'; error: null }
  | { status: 'load-error'; error: { message: string; canReset: boolean } };

export type VisitedCountries = ReturnType<typeof useVisitedCountries>;

export function useVisitedCountries(storage: VisitStorage) {
  const [visitedIds, setVisitedIds] = useState<ReadonlySet<CountryId>>(
    () => new Set(),
  );
  const [{ status, error: loadError }, setLoadState] = useState<LoadState>({
    status: 'loading',
    error: null,
  });
  const [saveError, setSaveError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latestIds = useRef(visitedIds);
  const revision = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    storage
      .load()
      .then((ids) => {
        if (!active) return;
        latestIds.current = ids;
        setVisitedIds(ids);
        setLoadState({ status: 'ready', error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadState({
          status: 'load-error',
          error: {
            message:
              error instanceof InvalidVisitsError
                ? error.message
                : 'Could not load your visits. Try again.',
            canReset: error instanceof InvalidVisitsError,
          },
        });
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [attempt, storage]);

  const persist = useCallback(
    (ids: ReadonlySet<CountryId>) => {
      const currentRevision = ++revision.current;
      storage
        .save(ids)
        .then(() => {
          if (mounted.current && revision.current === currentRevision)
            setSaveError(false);
        })
        .catch(() => {
          if (mounted.current && revision.current === currentRevision)
            setSaveError(true);
        });
    },
    [storage],
  );

  const setVisited = useCallback(
    (id: CountryId, visited: boolean) => {
      if (!countryIds.has(id)) throw new Error(`Unknown country: ${id}`);
      if (status !== 'ready' || latestIds.current.has(id) === visited) return;
      const next = new Set(latestIds.current);
      if (visited) next.add(id);
      else next.delete(id);
      latestIds.current = next;
      setVisitedIds(next);
      persist(next);
    },
    [persist, status],
  );

  const retry = useCallback(() => {
    if (status === 'load-error') {
      setLoadState({ status: 'loading', error: null });
      setAttempt((value) => value + 1);
    } else if (status === 'ready') persist(latestIds.current);
  }, [persist, status]);

  const resetUnreadableVisits = useCallback(async () => {
    if (!loadError?.canReset || status !== 'load-error') return;
    setLoadState({ status: 'loading', error: null });
    try {
      await storage.save(new Set());
      if (mounted.current) setAttempt((value) => value + 1);
    } catch {
      if (mounted.current) {
        setLoadState({
          status: 'load-error',
          error: {
            message: 'Could not reset saved visits. Try again.',
            canReset: true,
          },
        });
      }
    }
  }, [loadError, status, storage]);

  return {
    visitedIds,
    status,
    loadError,
    saveError,
    setVisited,
    retry,
    resetUnreadableVisits,
  };
}
