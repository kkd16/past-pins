import { continents } from './catalog';
import { searchCountries } from './search';
import type { Country, CountryId } from './types';

export type VisitFilter = 'all' | 'visited' | 'not-visited';
export type CountryFilters = {
  continent: string;
  grouping: 'continent' | 'alphabetical';
};
export type CountrySection = { key: string; title: string; data: Country[] };

export const defaultCountryFilters: CountryFilters = {
  continent: 'all',
  grouping: 'continent',
};

// Route inputs are untrusted, including links opened from outside the app.
export function readCountryFilters(params: {
  continent?: string | string[];
  grouping?: string | string[];
}): CountryFilters {
  return {
    continent: continents.some(({ id }) => id === params.continent)
      ? (params.continent as string)
      : 'all',
    grouping: params.grouping === 'alphabetical' ? 'alphabetical' : 'continent',
  };
}

export function selectCountrySections(
  query: string,
  visitFilter: VisitFilter,
  filters: CountryFilters,
  visitedIds: ReadonlySet<CountryId>,
): CountrySection[] {
  const results = searchCountries(query).filter(
    (country) =>
      (filters.continent === 'all' ||
        country.continent.id === filters.continent) &&
      (visitFilter === 'all' ||
        visitedIds.has(country.id) === (visitFilter === 'visited')),
  );
  if (filters.grouping === 'alphabetical') {
    return results.length ? [{ key: 'all', title: 'A–Z', data: results }] : [];
  }
  return continents.flatMap((continent) => {
    const data = results.filter(
      (country) => country.continent.id === continent.id,
    );
    return data.length
      ? [{ key: continent.id, title: continent.name, data }]
      : [];
  });
}
