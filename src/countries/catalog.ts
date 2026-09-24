import {
  continents as continentNames,
  countries as metadata,
  languages,
} from 'countries-list';
import { countryFeatures } from './geography';
import type { Continent, Country, CountryId } from './types';

const continentById = new Map<string, Continent>();

const locations: Country[] = countryFeatures.map((shape) => {
  const { iso_a2: code, name } = shape.properties;
  const details = metadata[code as keyof typeof metadata];
  if (!details || !name) throw new Error(`Missing country metadata: ${code}`);
  const continentId = details.continent;
  const continentName = continentNames[continentId];
  if (!continentName) throw new Error(`Missing continent: ${code}`);
  if (!continentById.has(continentId)) {
    continentById.set(continentId, { id: continentId, name: continentName });
  }
  return {
    id: code.toLowerCase(),
    name,
    continent: continentById.get(continentId)!,
    capital: details.capital,
    languages: details.languages.map((code) => languages[code].name),
    currencies: details.currency,
  };
});

export const countries: readonly Country[] = [...locations].sort((a, b) =>
  a.name.localeCompare(b.name, 'en'),
);
export const countryById = new Map(
  countries.map((country) => [country.id, country]),
);
export const countryIds: ReadonlySet<CountryId> = new Set(countryById.keys());
export const continents: readonly Continent[] = [
  ...continentById.values(),
].sort((a, b) => a.name.localeCompare(b.name, 'en'));

if (countryIds.size !== countries.length)
  throw new Error('Duplicate country IDs.');
