import { countries, countryById } from '../countries/catalog';
import { normalizeSearch } from '../countries/search';
import {
  getPlaceStatus,
  getSubdivisionStatus,
  isVisited,
  type AppData,
  type TravelList,
} from '../data/model';
import { compareNames, t } from '../localization';
import { subdivisions } from '../subdivisions/catalog';

export type ListPlace = {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
  kind: 'country' | 'region';
};

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

const entryById = new Map(
  [...countryIndex, ...regionIndex].map((entry) => [entry.place.id, entry]),
);

export function getListPlace(id: string): ListPlace | undefined {
  return entryById.get(id)?.place;
}

export function formatListPlaceName(place: ListPlace): string {
  return place.kind === 'region'
    ? t('lists.regionName', { name: place.name, country: place.countryName })
    : place.name;
}

export function searchListPlaces(
  query: string,
  scope: ListPlace['kind'] | ReadonlySet<string>,
) {
  const entries =
    typeof scope === 'string'
      ? scope === 'country'
        ? countryIndex
        : regionIndex
      : [...scope]
          .map((id) => entryById.get(id))
          .filter((entry) => entry !== undefined);
  const terms = normalizeSearch(query).split(/\s+/u);
  const matches = entries
    .filter(({ term }) => terms.every((part) => term.includes(part)))
    .map(({ place }) => place);
  return typeof scope === 'string'
    ? matches
    : matches.sort((a, b) => compareNames(a.name, b.name));
}

export function getListPlaceStatus(data: AppData, place: ListPlace) {
  return place.kind === 'country'
    ? getPlaceStatus(data, place.id)
    : getSubdivisionStatus(data, place.id);
}

export function getListStatistics(list: TravelList, data: AppData) {
  let visited = 0;
  let total = 0;
  for (const id of list.placeIds) {
    const place = getListPlace(id);
    if (!place) continue;
    total++;
    if (isVisited(getListPlaceStatus(data, place))) visited++;
  }
  return { visited, total };
}
