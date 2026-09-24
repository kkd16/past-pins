import type { AppData } from '../data/model';
import { isVisited } from '../data/model';
import { t } from '../localization';
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
  { value: 'all', label: t('countries.scopes.all') },
  { value: 'visited', label: t('countries.status.visited') },
  { value: 'wishlist', label: t('countries.status.wishlist') },
  { value: 'lived', label: t('countries.status.lived') },
  { value: 'not-visited', label: t('countries.status.notVisited') },
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
    return results.length
      ? [{ key: 'all', title: t('countries.alphabetical'), data: results }]
      : [];
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
      title: t('countries.empty.title'),
      message: t('countries.empty.message'),
    };
  switch (scope) {
    case 'wishlist':
      return {
        title: t('countries.empty.wishlistTitle'),
        message: t('countries.empty.wishlistMessage'),
      };
    case 'visited':
      return {
        title: t('countries.empty.visitedTitle'),
        message: t('countries.empty.visitedMessage'),
      };
    case 'lived':
      return {
        title: t('countries.empty.livedTitle'),
        message: t('countries.empty.livedMessage'),
      };
    case 'not-visited':
      return {
        title: t('countries.empty.completeTitle'),
        message: t('countries.empty.completeMessage'),
      };
    default:
      return {
        title: t('countries.empty.title'),
        message: t('countries.empty.message'),
      };
  }
}
