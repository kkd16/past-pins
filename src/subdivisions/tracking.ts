import { matchesCountryScope, type CountryScope } from '../countries/filters';
import { isVisited, type AppData } from '../data/model';
import { searchPlaces } from '../places/catalog';
import { getCountrySubdivisions, subdivisionById, subdivisions } from './catalog';

export function selectSubdivisions(
  countryId: string,
  query: string,
  scope: CountryScope,
  statuses: AppData['subdivisions'],
) {
  return searchPlaces(query, 'region', countryId)
    .filter((region) => matchesCountryScope(statuses[region.id], scope))
    .map(({ id }) => subdivisionById.get(id)!);
}

export function getSubdivisionStatistics(
  statuses: AppData['subdivisions'],
  countryId?: string,
) {
  const regions =
    countryId === undefined ? subdivisions : getCountrySubdivisions(countryId);
  let visited = 0;
  let lived = 0;
  let wishlist = 0;
  for (const region of regions) {
    const status = statuses[region.id];
    if (isVisited(status)) visited++;
    if (status === 'lived') lived++;
    if (status === 'wishlist') wishlist++;
  }
  return {
    total: regions.length,
    visited,
    lived,
    wishlist,
    remaining: regions.length - visited,
  };
}
