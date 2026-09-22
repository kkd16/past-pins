import { countries } from './catalog';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en')
    .trim();
}

const searchIndex = countries.map((country) => ({
  country,
  term: normalizeSearch(`${country.name} ${country.id}`),
}));

export function searchCountries(query: string) {
  const normalized = normalizeSearch(query);
  return searchIndex
    .filter(({ term }) => term.includes(normalized))
    .map(({ country }) => country);
}
