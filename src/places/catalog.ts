import { countries, countryById } from '../countries/catalog';
import { normalizeSearch } from '../countries/search';
import { getCities, searchCities } from '../cities/database';
import { getCityParents, isCityId } from '../cities/index';
import { getSearchPage } from '../cities/query';
import type { City, CitySearchOptions } from '../cities/types';
import { t } from '../localization';
import { subdivisionById, subdivisions } from '../subdivisions/catalog';

export type Place = {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
} & (
  | { kind: 'country' | 'region' }
  | { kind: 'city'; regionId?: string; regionName?: string; coordinates: [number, number] }
);

export type PlaceScope = 'all' | Place['kind'];
export type PlaceSearchOptions = CitySearchOptions & { scope?: PlaceScope };

const countryIndex = countries.map((country) => ({
  place: {
    id: country.id,
    name: country.name,
    countryId: country.id,
    countryName: country.name,
    kind: 'country' as const,
  },
  term: normalizeSearch(`${country.name} ${country.nativeName} ${country.id}`),
}));
const regionIndex = subdivisions.map((region) => {
  const country = countryById.get(region.countryId)!;
  return {
    place: {
      id: region.id,
      name: region.name,
      countryId: country.id,
      countryName: country.name,
      kind: 'region' as const,
    },
    term: normalizeSearch(
      `${region.name} ${region.nativeName} ${region.code} ${region.aliases.join(' ')} ${country.name} ${country.nativeName} ${country.id}`,
    ),
  };
});
const allEntries = [...countryIndex, ...regionIndex];
const staticIndexes = { all: allEntries, country: countryIndex, region: regionIndex, city: [] };
const entryById = new Map(allEntries.map((entry) => [entry.place.id, entry]));

function cityPlace(city: City): Place {
  return {
    id: city.id,
    name: city.name,
    kind: 'city',
    countryId: city.countryId,
    countryName: countryById.get(city.countryId)!.name,
    regionId: city.regionId,
    regionName: city.regionId
      ? subdivisionById.get(city.regionId)?.name
      : city.adminName,
    coordinates: [city.longitude, city.latitude],
  };
}

export function getStaticPlace(id: string) {
  return entryById.get(id)?.place;
}

export function getPlaceReference(id: string) {
  const place = entryById.get(id)?.place;
  if (place) return { id, kind: place.kind, countryId: place.countryId, regionId: undefined };
  const parents = getCityParents(id);
  return parents ? { id, kind: 'city' as const, ...parents } : undefined;
}

export async function getPlaces(ids: readonly string[]): Promise<Place[]> {
  const cityIds = ids.filter(isCityId);
  const cities = cityIds.length ? (await getCities(cityIds)).map(cityPlace) : [];
  const cityById = new Map(cities.map((place) => [place.id, place]));
  return ids.flatMap((id) => {
    const place = entryById.get(id)?.place ?? cityById.get(id);
    return place ? [place] : [];
  });
}

export function getPlaceSubtitle(place: Place): string {
  if (place.kind === 'country') return countryById.get(place.id)!.continent.name;
  return place.kind === 'city' && place.regionName
    ? t('places.cityContext', { region: place.regionName, country: place.countryName })
    : place.countryName;
}

export function formatPlaceName(place: Place): string {
  return place.kind === 'country'
    ? place.name
    : t('lists.regionName', { name: place.name, country: getPlaceSubtitle(place) });
}

export function searchStaticPlaces({
  query, scope = 'all', countryId, countryIds, regionId, ids, excludedIds,
}: PlaceSearchOptions) {
  const terms = normalizeSearch(query).split(/\s+/u);
  const included = ids && new Set(ids);
  const excluded = new Set(excludedIds);
  return staticIndexes[scope].filter(({ place, term }) =>
    (!countryId || place.countryId === countryId) &&
    (!countryIds || countryIds.includes(place.countryId)) &&
    (!regionId || place.id === regionId) &&
    (!included || included.has(place.id)) &&
    !excluded.has(place.id) &&
    terms.every((part) => term.includes(part)),
  ).map(({ place }) => place);
}

export function searchNeedsCities({ scope = 'all', ids }: PlaceSearchOptions) {
  return (scope === 'all' || scope === 'city') && (!ids || ids.some(isCityId));
}

export async function searchPlacesPage(options: PlaceSearchOptions): Promise<Place[]> {
  const { offset, limit } = getSearchPage(options);
  const staticMatches = searchStaticPlaces(options);
  const page = staticMatches.slice(offset, offset + limit);
  if (page.length === limit || !searchNeedsCities(options)) return page;
  const cities = await searchCities({
    ...options,
    offset: Math.max(0, offset - staticMatches.length),
    limit: limit - page.length,
  });
  return [...page, ...cities.map(cityPlace)];
}
