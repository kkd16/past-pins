import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { countryIds } from './catalog';
import type { CountryId } from './types';
import { createVisitStorage, InvalidVisitsError } from './visit-storage';

const storage = createVisitStorage(AsyncStorage, countryIds);

export function useVisitedCountries() {
  const [visitedIds, setVisitedIds] = useState<ReadonlySet<CountryId>>(
    new Set(),
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'load-error'>(
    'loading',
  );
  const [loadError, setLoadError] = useState<{
    message: string;
    canReset: boolean;
  } | null>(null);
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
        setLoadError(null);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError({
          message:
            error instanceof InvalidVisitsError
              ? error.message
              : 'Could not load your visits. Try again.',
          canReset: error instanceof InvalidVisitsError,
        });
        setStatus('load-error');
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [attempt]);

  const persist = useCallback((ids: ReadonlySet<CountryId>) => {
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
  }, []);

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
      setStatus('loading');
      setAttempt((value) => value + 1);
    } else if (status === 'ready') persist(latestIds.current);
  }, [persist, status]);

  const resetUnreadableVisits = useCallback(async () => {
    if (!loadError?.canReset || status !== 'load-error') return;
    setStatus('loading');
    try {
      await storage.save(new Set());
      if (mounted.current) setAttempt((value) => value + 1);
    } catch {
      if (mounted.current) {
        setLoadError({
          message: 'Could not reset saved visits. Try again.',
          canReset: true,
        });
        setStatus('load-error');
      }
    }
  }, [loadError, status]);

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
