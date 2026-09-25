import type { CountryScope } from '../countries/filters';
import { normalizeSearch, searchCountries } from '../countries/search';
import { isVisited, type AppData } from '../data/model';
import { getCountrySubdivisions, subdivisions } from './catalog';

export const subdivisionCountries = searchSubdivisionCountries('');

export function searchSubdivisionCountries(query: string) {
  return searchCountries(query).filter(
    (country) => getCountrySubdivisions(country.id).length > 0,
  );
}

export function selectSubdivisions(
  countryId: string,
  query: string,
  scope: CountryScope,
  statuses: AppData['subdivisions'],
) {
  const term = normalizeSearch(query);
  return getCountrySubdivisions(countryId).filter((region) => {
    if (
      !normalizeSearch(
        `${region.name} ${region.nativeName} ${region.code} ${region.aliases.join(' ')}`,
      ).includes(term)
    )
      return false;
    const status = statuses[region.id];
    switch (scope) {
      case 'visited':
        return isVisited(status);
      case 'not-visited':
        return !isVisited(status);
      case 'wishlist':
        return status === 'wishlist';
      case 'lived':
        return status === 'lived';
      default:
        return true;
    }
  });
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
