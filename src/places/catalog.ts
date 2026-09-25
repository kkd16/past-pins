import { countries, countryById } from '../countries/catalog';
import { normalizeSearch } from '../countries/search';
import {
  getPlaceStatus as getCountryStatus,
  getSubdivisionStatus,
  type AppData,
} from '../data/model';
import { compareNames, t } from '../localization';
import { subdivisions } from '../subdivisions/catalog';

export type Place = {
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

const allEntries = [...countryIndex, ...regionIndex];
const entryById = new Map(allEntries.map((entry) => [entry.place.id, entry]));

export function getPlace(id: string): Place | undefined {
  return entryById.get(id)?.place;
}

export function formatPlaceName(place: Place): string {
  return place.kind === 'region'
    ? t('lists.regionName', { name: place.name, country: place.countryName })
    : place.name;
}

export function searchPlaces(
  query: string,
  scope: 'all' | Place['kind'] | ReadonlySet<string>,
  countryId?: string,
) {
  const entries =
    typeof scope === 'string'
      ? scope === 'all'
        ? allEntries
        : scope === 'country'
          ? countryIndex
          : regionIndex
      : [...scope]
          .map((id) => entryById.get(id))
          .filter((entry) => entry !== undefined);
  const terms = normalizeSearch(query).split(/\s+/u);
  const matches = entries
    .filter(
      ({ place, term }) =>
        (!countryId || place.countryId === countryId) &&
        terms.every((part) => term.includes(part)),
    )
    .map(({ place }) => place);
  return typeof scope === 'string'
    ? matches
    : matches.sort(
        (a, b) =>
          (a.kind === b.kind ? 0 : a.kind === 'country' ? -1 : 1) ||
          compareNames(a.name, b.name) ||
          a.id.localeCompare(b.id, 'en'),
      );
}

export function getPlaceStatus(data: AppData, place: Place) {
  return place.kind === 'country'
    ? getCountryStatus(data, place.id)
    : getSubdivisionStatus(data, place.id);
}
