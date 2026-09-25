import { countryById } from '../countries/catalog';
import { matchesCountryScope, type CountryScope } from '../countries/filters';
import { isVisited, type AppData } from '../data/model';
import { subdivisionsByCountry } from '../subdivisions/catalog';
import { searchPlaces } from './catalog';

export function selectRegions(
  query: string,
  scope: CountryScope,
  continent: string,
  statuses: AppData['subdivisions'],
) {
  return searchPlaces(query, 'region').filter((region) => {
    if (
      continent !== 'all' &&
      countryById.get(region.countryId)?.continent.id !== continent
    )
      return false;
    return matchesCountryScope(statuses[region.id], scope);
  });
}

export type RegionProgress = { visited: number; total: number };

export function getCountryRegionProgress(statuses: AppData['subdivisions']) {
  return new Map<string, RegionProgress>(
    [...subdivisionsByCountry].map(([id, regions]) => [
      id,
      {
        total: regions.length,
        visited: regions.reduce(
          (count, region) => count + Number(isVisited(statuses[region.id])),
          0,
        ),
      },
    ]),
  );
}
