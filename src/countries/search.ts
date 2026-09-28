import { countries } from './catalog';
import { rankEntries, searchEntry, suggestEntries } from '../places/search';

export const countrySearchIndex = countries.map((country) => searchEntry(country, country.name, [country.nativeName, country.id]));

export function searchCountries(query: string) {
  return rankEntries(countrySearchIndex, query).map(({ item }) => item);
}

export function suggestCountries(query: string, includedIds: ReadonlySet<string>) {
  return suggestEntries(countrySearchIndex.filter(({ item }) => includedIds.has(item.id)), query);
}
