import { compareNames } from '../localization';
import data from './catalog.json';
import type { Subdivision, SubdivisionId } from './types';

export const subdivisionSource = data.source;
export const subdivisions: readonly Subdivision[] = [...data.regions].sort(
  (a, b) => compareNames(a.name, b.name) || a.id.localeCompare(b.id, 'en'),
);
export const subdivisionById: ReadonlyMap<SubdivisionId, Subdivision> = new Map(
  subdivisions.map((region) => [region.id, region]),
);
export const subdivisionIds: ReadonlySet<SubdivisionId> = new Set(
  subdivisionById.keys(),
);

const byCountry = new Map<string, Subdivision[]>();
for (const region of subdivisions) {
  const regions = byCountry.get(region.countryId) ?? [];
  regions.push(region);
  byCountry.set(region.countryId, regions);
}

export const subdivisionsByCountry: ReadonlyMap<
  string,
  readonly Subdivision[]
> = byCountry;
export const subdivisionCountriesCount = subdivisionsByCountry.size;
const empty: readonly Subdivision[] = [];

export function getCountrySubdivisions(
  countryId: string,
): readonly Subdivision[] {
  return subdivisionsByCountry.get(countryId) ?? empty;
}
