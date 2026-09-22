import world from '@svg-maps/world';
import type { Country, CountryId } from './types';

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
