import { getCityParents, isCityId } from '../cities';
import { countryIds } from '../countries/catalog';
import { subdivisionById } from '../subdivisions/catalog';

export function isPlaceId(id: unknown): id is string {
  return typeof id === 'string' &&
    (countryIds.has(id) || subdivisionById.has(id) || isCityId(id));
}

export function getParentPlaceIds(id: string): readonly string[] {
  const region = subdivisionById.get(id);
  if (region) return [region.countryId];
  const city = getCityParents(id);
  return city
    ? city.regionId ? [city.regionId, city.countryId] : [city.countryId]
    : [];
}
