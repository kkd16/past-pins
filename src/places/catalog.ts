import { countryById } from '../countries/catalog';
import { countrySearchIndex } from '../countries/search';
import { getCities, getCitySuggestions, searchCityMatches } from '../cities/database';
import { getCityParents, isCityId } from '../cities/index';
import { cityFromRow, getSearchPage } from '../cities/query';
import type { City, CitySearchOptions } from '../cities/types';
import { t } from '../localization';
import { subdivisionById, subdivisions } from '../subdivisions/catalog';
import { rankEntries, searchEntry, searchName, suggestEntries, type SearchEntry } from './search';

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
export type PlaceMatch = Place & { searchRank: number };
export type StaticPlace = Extract<Place, { kind: 'country' | 'region' }>;

const countryIndex = countrySearchIndex.map(({ item: country, ...entry }): SearchEntry<StaticPlace> => ({
  ...entry,
  item: { id: country.id, name: country.name, countryId: country.id, countryName: country.name, kind: 'country' },
}));
const regionIndex = subdivisions.map((region) => {
  const country = countryById.get(region.countryId)!;
  return searchEntry<StaticPlace>({
    id: region.id,
    name: region.name,
    countryId: country.id,
    countryName: country.name,
    kind: 'region',
  }, region.name, [region.nativeName, region.code, region.code.split('-').at(-1)!, ...region.aliases], [region.kind, country.name, country.nativeName, country.id]);
});
const allEntries = [...countryIndex, ...regionIndex];
const staticIndexes = { all: allEntries, country: countryIndex, region: regionIndex, city: [] };
const entryById = new Map(allEntries.map((entry) => [entry.item.id, entry]));

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
  return entryById.get(id)?.item;
}

export function getPlaceReference(id: string) {
  const place = entryById.get(id)?.item;
  if (place) return { id, kind: place.kind, countryId: place.countryId, regionId: undefined };
  const parents = getCityParents(id);
  return parents ? { id, kind: 'city' as const, ...parents } : undefined;
}

export async function getPlaces(ids: readonly string[]): Promise<Place[]> {
  const cityIds = ids.filter(isCityId);
  const cities = cityIds.length ? (await getCities(cityIds)).map(cityPlace) : [];
  const cityById = new Map(cities.map((place) => [place.id, place]));
  return ids.flatMap((id) => {
    const place = entryById.get(id)?.item ?? cityById.get(id);
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

function staticEntries({
  scope = 'all', countryId, countryIds, regionId, ids, excludedIds,
}: PlaceSearchOptions) {
  const included = ids && new Set(ids);
  const excluded = new Set(excludedIds);
  return staticIndexes[scope].filter(({ item: place }) =>
    (!countryId || place.countryId === countryId) &&
    (!countryIds || countryIds.includes(place.countryId)) &&
    (!regionId || place.id === regionId) &&
    (!included || included.has(place.id)) &&
    !excluded.has(place.id),
  );
}

export function searchStaticPlaces(options: PlaceSearchOptions) {
  return rankEntries(staticEntries(options), options.query).map(({ item }) => item);
}

export function suggestStaticPlaces(options: PlaceSearchOptions) {
  return suggestEntries(staticEntries(options), options.query);
}

export function searchNeedsCities({ scope = 'all', ids }: PlaceSearchOptions) {
  return (scope === 'all' || scope === 'city') && (!ids || ids.some(isCityId));
}

export async function searchPlacesPage(options: PlaceSearchOptions): Promise<PlaceMatch[]> {
  const { offset, limit } = getSearchPage(options);
  const staticMatches = rankEntries(staticEntries(options), options.query).map(({ item, rank }) => ({ ...item, searchRank: rank }));
  const page = staticMatches.slice(offset, offset + limit);
  if (!searchNeedsCities(options) || (!options.query.trim() && page.length === limit)) return page;
  const mixedSearch = !!options.query.trim();
  const rows = await searchCityMatches({
    ...options,
    offset: mixedSearch ? offset : Math.max(0, offset - staticMatches.length),
    limit: mixedSearch ? limit : limit - page.length,
  }, mixedSearch ? staticMatches.map(({ id, name, kind, searchRank }) => ({ id, name, kind, rank: searchRank })) : []);
  const matches = rows.map((row) => ({
    ...(row.staticId !== null ? getStaticPlace(row.staticId)! : cityPlace(cityFromRow(row))),
    searchRank: row.searchRank,
  }));
  return mixedSearch ? matches : [...page, ...matches];
}

export async function searchPlaceSuggestions(options: PlaceSearchOptions, matches: readonly PlaceMatch[]) {
  if (options.query.trim().length < 4 || matches.some(({ searchRank }) => searchRank <= 1)) return [];
  const matched = new Set(matches.map(({ name }) => searchName(name)));
  const entries: SearchEntry<Place>[] = staticEntries(options).filter(({ normalizedName }) => !matched.has(normalizedName));
  if (searchNeedsCities(options)) {
    const cities = await getCitySuggestions(options);
    entries.push(...cities.sort((a, b) => b.population - a.population).filter(({ name }) => !matched.has(searchName(name)))
      .map((city) => searchEntry(cityPlace(city), city.name)));
  }
  return suggestEntries(entries, options.query);
}
