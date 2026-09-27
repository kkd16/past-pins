import maps from './maps.json';
import type { SubdivisionMapData } from './types';

export type { SubdivisionMapData, SubdivisionMapRegion } from './types';

const mapsByCountry = maps as unknown as Record<string, SubdivisionMapData>;

export function getSubdivisionMap(countryId: string) {
  return Object.hasOwn(mapsByCountry, countryId)
    ? mapsByCountry[countryId]
    : undefined;
}
