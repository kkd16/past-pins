import data from './parents.json';
import type { CityParentIndex, CityParents } from './types';

const source = data as CityParentIndex;

export function getCityParents(id: string): CityParents | undefined {
  if (!/^city:[1-9]\d*$/u.test(id)) return undefined;
  const value = Number(id.slice(5));
  if (!Number.isSafeInteger(value)) return undefined;
  let low = 0;
  let high = source.ids.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const candidate = source.ids[middle];
    if (candidate === value) {
      const [countryId, regionId] = source.parents[source.parentIndexes[middle]];
      return regionId ? { countryId, regionId } : { countryId };
    }
    if (candidate < value) low = middle + 1;
    else high = middle - 1;
  }
  return undefined;
}

export function isCityId(id: string): boolean {
  return getCityParents(id) !== undefined;
}

export const cityCount = source.ids.length;
