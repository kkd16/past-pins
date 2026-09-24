import type { AppData } from '../data/model';
import { isVisited } from '../data/model';
import { continents } from './catalog';
import { searchCountries } from './search';
import type { Country } from './types';

export type CountryScope =
  'all' | 'visited' | 'wishlist' | 'lived' | 'not-visited';
export type CountryFilters = {
  continent: string;
  grouping: 'continent' | 'alphabetical';
};
export type CountrySection = { key: string; title: string; data: Country[] };

export const countryScopes: { value: CountryScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visited', label: 'Visited' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'lived', label: 'Lived' },
  { value: 'not-visited', label: 'Not visited' },
];

export const defaultCountryFilters: CountryFilters = {
  continent: 'all',
  grouping: 'continent',
};

export function readCountryScope(value: unknown): CountryScope {
  return countryScopes.find((scope) => scope.value === value)?.value ?? 'all';
}

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
  scope: CountryScope,
  filters: CountryFilters,
  places: AppData['places'],
): CountrySection[] {
  const results = searchCountries(query).filter((country) => {
    if (
      filters.continent !== 'all' &&
      country.continent.id !== filters.continent
    )
      return false;
    const status = places[country.id];
    switch (scope) {
      case 'visited':
        return isVisited(status);
      case 'not-visited':
        return !isVisited(status);
      case 'wishlist':
        return status === 'wishlist';
      case 'lived':
        return status === 'lived';
      default:
        return true;
    }
  });
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

export function getEmptyCountriesMessage(
  scope: CountryScope,
  narrowed: boolean,
) {
  if (narrowed)
    return {
      title: 'No matching places',
      message: 'Try another name or change your filters.',
    };
  switch (scope) {
    case 'wishlist':
      return {
        title: 'Where to next?',
        message: 'Add places to your wishlist from their country details.',
      };
    case 'visited':
      return {
        title: 'Your world starts here',
        message: 'Mark a place visited to start your collection.',
      };
    case 'lived':
      return {
        title: 'Places you’ve called home',
        message: 'Mark places Lived to keep them together here.',
      };
    case 'not-visited':
      return {
        title: 'Every place visited',
        message: 'You’ve marked every country and territory in the catalog.',
      };
    default:
      return {
        title: 'No matching places',
        message: 'Try another name or change your filters.',
      };
  }
}
