import { useEffect, useMemo, useState } from 'react';

import { useCityCatalogStatus } from '../cities/database';
import { isCityId } from '../cities/index';
import { useAppData } from '../data/AppData';
import { getStaticPlace, getPlaces, type Place } from './catalog';

export function usePlaces(ids: readonly string[]) {
  const catalog = useCityCatalogStatus();
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const needsCities = ids.some(isCityId);
  const key = JSON.stringify([ids, resetVersion, needsCities ? catalog.revision : 0]);
  const [result, setResult] = useState<{ key: string; places: Place[]; error: boolean }>();
  useEffect(() => {
    if (!needsCities || !catalog.ready) return;
    let current = true;
    const [requestedIds] = JSON.parse(key) as [string[]];
    void getPlaces(requestedIds).then(
      (places) => { if (current) setResult({ key, places, error: false }); },
      () => { if (current) setResult({ key, places: [], error: true }); },
    );
    return () => { current = false; };
  }, [key, needsCities, catalog.ready]);
  const active = result?.key === key ? result : undefined;
  const error = needsCities && (catalog.error || !!active?.error);
  const places = useMemo(() => {
    if (needsCities) return active?.places ?? [];
    const [requestedIds] = JSON.parse(key) as [string[]];
    return requestedIds.flatMap((id) => {
      const place = getStaticPlace(id);
      return place ? [place] : [];
    });
  }, [key, needsCities, active]);
  return {
    places,
    loading: needsCities && !active && !error,
    error,
    retry: catalog.retry,
  };
}
