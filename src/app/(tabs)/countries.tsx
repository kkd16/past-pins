import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

import {
  readCountryFilters,
  readCountryScope,
  type CountryScope,
} from '../../countries/filters';
import { useAppData } from '../../data/AppDataProvider';
import { CountriesScreen } from '../../screens/CountriesScreen';
import { RegionsScreen } from '../../screens/RegionsScreen';
import { getPlace } from '../../places/catalog';
import type { PlacesMode } from '../../places/PlaceKindControl';

export default function CountriesRoute() {
  const params = useLocalSearchParams<{
    continent?: string;
    scope?: string;
    query?: string;
    intent?: string;
    mode?: string;
  }>();
  const { data } = useAppData();
  const requestedQuery =
    typeof params.query === 'string' ? params.query : undefined;
  const intent = typeof params.intent === 'string' ? params.intent : undefined;
  const [search, setSearch] = useState({
    request: requestedQuery,
    value: requestedQuery ?? '',
  });
  if (search.request !== requestedQuery)
    setSearch({
      request: requestedQuery,
      value: requestedQuery ?? search.value,
    });
  // Consume navigation requests so the same search link works again later.
  useEffect(() => {
    if (requestedQuery !== undefined) router.setParams({ query: undefined });
  }, [requestedQuery]);
  const selectCountry = useCallback(
    (id: string) => router.push({ pathname: '/country/[id]', params: { id } }),
    [],
  );
  const filters = readCountryFilters({
    continent: params.continent,
    grouping: data.preferences.countryGrouping,
  });
  const mode = params.mode === 'regions' ? 'regions' : 'countries';
  const scope = readCountryScope(params.scope);
  const sharedProps = {
    scope,
    query: search.value,
    intent,
    onQueryChange: (value: string) =>
      setSearch({ request: requestedQuery, value }),
    onScopeChange: (scope: CountryScope) => router.setParams({ scope }),
    onModeChange: (mode: PlacesMode) => {
      Keyboard.dismiss();
      router.setParams({ mode });
    },
    onOpenFilters: () =>
      router.push({
        pathname: '/filters',
        params: {
          ...filters,
          mode,
          scope,
          query: search.value,
        },
      }),
    onResetFilters: () => {
      setSearch({ request: requestedQuery, value: '' });
      router.setParams({ continent: 'all', scope: 'all', query: undefined });
    },
  };
  if (mode === 'regions')
    return (
      <RegionsScreen
        {...sharedProps}
        continent={filters.continent}
        onSelect={(id) => {
          const region = getPlace(id);
          if (region)
            router.push({
              pathname: '/regions/[id]',
              params: {
                id: region.countryId,
                focus: id,
                scope,
              },
            });
        }}
        onSaveToLists={(placeId) =>
          router.push({ pathname: '/lists/add', params: { placeId } })
        }
      />
    );
  return (
    <CountriesScreen
      {...sharedProps}
      filters={filters}
      onSelect={selectCountry}
      onOpenRegions={(id) =>
        router.push({ pathname: '/regions/[id]', params: { id } })
      }
    />
  );
}
