import { isVisited, type AppData } from '../data/model';
import { getPlaceReference, type Place } from './catalog';

export function getPlaceStatistics(statuses: AppData['places'], kind: Place['kind'], countryId?: string, regionId?: string) {
  let saved = 0;
  let visited = 0;
  let lived = 0;
  let wishlist = 0;
  for (const [id, status] of Object.entries(statuses)) {
    const place = getPlaceReference(id);
    if (!place || place.kind !== kind || (countryId && place.countryId !== countryId) || (regionId && place.regionId !== regionId)) continue;
    saved++;
    if (isVisited(status)) visited++;
    if (status === 'lived') lived++;
    if (status === 'wishlist') wishlist++;
  }
  return { saved, visited, lived, wishlist };
}
