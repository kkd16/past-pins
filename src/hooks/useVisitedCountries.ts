import { useCallback, useEffect, useRef, useState } from 'react';

import { countryIds } from '../countries/catalog';
import type { VisitStorage } from '../countries/visit-storage';
import type { CountryId } from '../countries/types';

type LoadStatus = 'loading' | 'ready' | 'load-error';

export type VisitedCountries = ReturnType<typeof useVisitedCountries>;

export function useVisitedCountries(storage: VisitStorage) {
  const [visitedIds, setVisitedIds] = useState<ReadonlySet<CountryId>>(
    () => new Set(),
  );
  const [status, setStatus] = useState<LoadStatus>('loading');
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
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('load-error');
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
      setStatus('loading');
      setAttempt((value) => value + 1);
    } else if (status === 'ready') persist(latestIds.current);
  }, [persist, status]);

  return {
    visitedIds,
    status,
    saveError,
    setVisited,
    retry,
  };
}
