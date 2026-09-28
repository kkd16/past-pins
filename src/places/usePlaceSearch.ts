import { useCallback, useEffect, useRef, useState } from 'react';

import { useCityCatalogStatus } from '../cities/database';
import { useAppData } from '../data/AppData';
import { searchNeedsCities, searchPlacesPage, type Place, type PlaceSearchOptions } from './catalog';

export function usePlaceSearch(options: Omit<PlaceSearchOptions, 'offset' | 'limit'>) {
  const catalog = useCityCatalogStatus();
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const needsCities = searchNeedsCities(options);
  const key = JSON.stringify([options, resetVersion, needsCities ? catalog.revision : 0]);
  const session = useRef<{ busy: boolean; key: string } | null>(null);
  const [result, setResult] = useState({ key: '', places: [] as Place[], more: false, loading: false, error: false });
  const active = result.key === key ? result : undefined;
  const ready = !needsCities || catalog.ready;

  const fetchPage = useCallback((offset: number, token: { busy: boolean; key: string }) => {
    token.busy = true;
    const [request] = JSON.parse(key) as [PlaceSearchOptions];
    return searchPlacesPage({ ...request, offset, limit: 50 }).then(
      (places) => {
        if (session.current === token) setResult((previous) => ({
          key, places: offset ? [...previous.places, ...places] : places,
          more: places.length === 50, loading: false, error: false,
        }));
      },
      () => {
        if (session.current === token) setResult((previous) => ({
          key, places: offset ? previous.places : [], more: false, loading: false, error: true,
        }));
      },
    ).finally(() => { token.busy = false; });
  }, [key]);
  useEffect(() => {
    const token = { busy: false, key };
    session.current = token;
    if (ready) void fetchPage(0, token);
    return () => { session.current = null; };
  }, [key, ready, fetchPage]);

  const error = (needsCities && catalog.error) || !!active?.error;
  return {
    places: active?.places ?? [],
    loading: !error && (!active || active.loading),
    error,
    more: !!active?.more,
    loadMore() {
      const token = session.current;
      if (ready && active?.more && token?.key === key && !token.busy) {
        setResult((previous) => ({ ...previous, loading: true }));
        void fetchPage(active.places.length, token);
      }
    },
    retry: catalog.retry,
  };
}
