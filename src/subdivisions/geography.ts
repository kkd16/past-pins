import maps from './maps.json';
import type { SubdivisionMapData } from './types';

export type { SubdivisionMapData, SubdivisionMapRegion } from './types';

// Projected paths are generated ahead of time; mobile never fetches or projects
// the 40 MB upstream source. A screen renders only its country's shapes.
const mapsByCountry = maps as unknown as Record<string, SubdivisionMapData>;

export function getSubdivisionMap(countryId: string) {
  return Object.hasOwn(mapsByCountry, countryId)
    ? mapsByCountry[countryId]
    : undefined;
}
