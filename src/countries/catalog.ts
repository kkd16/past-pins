import {
  continents as continentNames,
  countries as metadata,
  languages,
} from 'countries-list';
import { compareNames } from '../localization';
import { countryFeatures } from './geography';
import funds from './fund-codes.json';
import type { Continent, Country, CountryId } from './types';

const continentById = new Map<string, Continent>();
const fundCodes = new Set(funds.codes);

export const countries: readonly Country[] = countryFeatures.map((shape) => {
  const { iso_a2: code, name } = shape.properties;
  const details = metadata[code as keyof typeof metadata];
  if (!details || !name) throw new Error(`Missing country metadata: ${code}`);
  const continentId = details.continent;
  const continentName = continentNames[continentId];
  if (!continentName) throw new Error(`Missing continent: ${code}`);
  if (!continentById.has(continentId)) {
    continentById.set(continentId, {
      id: continentId,
      name: continentName,
    });
  }
  return {
    id: code.toLowerCase(),
    name,
    nativeName: details.native,
    continent: continentById.get(continentId)!,
    capital: details.capital,
    languages: details.languages.map((code) => languages[code].name),
    currencies: details.currency.filter((code) => !fundCodes.has(code)),
  };
}).sort((a, b) => compareNames(a.name, b.name));
export const countryById = new Map(
  countries.map((country) => [country.id, country]),
);
export const countryIds: ReadonlySet<CountryId> = new Set(countryById.keys());
export const continents: readonly Continent[] = [
  ...continentById.values(),
].sort((a, b) => compareNames(a.name, b.name));

if (countryIds.size !== countries.length)
  throw new Error('Duplicate country IDs.');
