import { isVisited, type AppData } from '../data/model';
import { subdivisionsByCountry } from '../subdivisions/catalog';

export type RegionProgress = { visited: number; total: number };

export function getCountryRegionProgress(statuses: AppData['places']) {
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
