import { countries } from './catalog';
import { language } from '../localization';

export function normalizeSearch(value: string, locale = language) {
  return value
    .toLocaleLowerCase(locale)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

const searchIndex = countries.map((country) => ({
  country,
  term: normalizeSearch(`${country.name} ${country.nativeName} ${country.id}`),
}));

export function searchCountries(query: string) {
  const normalized = normalizeSearch(query);
  return searchIndex
    .filter(({ term }) => term.includes(normalized))
    .map(({ country }) => country);
}
