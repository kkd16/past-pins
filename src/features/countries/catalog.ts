import world from '@svg-maps/world';
import type { Country, CountryId } from './types';

// One packaged dataset drives both the checklist and map, with no ID reconciliation.
const locations: Country[] = world.locations.map(({ id, name, path }) => {
  if (!name) throw new Error(`Map location ${id} has no name.`);
  return { id, name, path };
});
export const worldMap = { ...world, locations };
export const countries: readonly Country[] = [...locations].sort((a, b) =>
  a.name.localeCompare(b.name, 'en'),
);
export const countryById = new Map(
  countries.map((country) => [country.id, country]),
);
export const countryIds: ReadonlySet<CountryId> = new Set(countryById.keys());

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en')
    .trim();
}

const searchTerms = new Map(
  countries.map((country) => [
    country.id,
    normalizeSearch(`${country.name} ${country.id}`),
  ]),
);

export function searchCountries(query: string) {
  const normalized = normalizeSearch(query);
  return countries.filter((country) =>
    searchTerms.get(country.id)!.includes(normalized),
  );
}
