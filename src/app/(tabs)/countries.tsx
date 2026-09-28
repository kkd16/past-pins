import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

import {
  readCountryFilters,
  readCountryScope,
  type CountryScope,
} from '../../countries/filters';
import { useAppData } from '../../data/AppData';
import { CountriesScreen } from '../../screens/CountriesScreen';
import { PlacesListScreen } from '../../screens/PlacesListScreen';
import { countryById } from '../../countries/catalog';
import { subdivisionById } from '../../subdivisions/catalog';
import { countryHref, placeHref, regionsHref } from '../../places/navigation';
import type { PlacesMode } from '../../places/PlaceKindControl';

export default function CountriesRoute() {
  const params = useLocalSearchParams<{
    continent?: string;
    scope?: string;
    query?: string;
    intent?: string;
    mode?: string;
    countryId?: string;
    regionId?: string;
  }>();
  const grouping = useAppData((snapshot) => snapshot.data.preferences.countryGrouping);
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
  useEffect(() => {
    if (requestedQuery !== undefined) router.setParams({ query: undefined });
  }, [requestedQuery]);
  const selectCountry = useCallback(
    (id: string) => router.push(countryHref(id)),
    [],
  );
  const filters = readCountryFilters({
    continent: params.continent,
    grouping,
  });
  const mode = params.mode === 'cities' ? 'cities' : params.mode === 'regions' ? 'regions' : 'countries';
  const countryId = typeof params.countryId === 'string' && countryById.has(params.countryId) ? params.countryId : undefined;
  const regionId = countryId && typeof params.regionId === 'string' && subdivisionById.get(params.regionId)?.countryId === countryId ? params.regionId : undefined;
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
      router.setParams({ mode, countryId: undefined, regionId: undefined });
    },
    onOpenFilters: () =>
      router.push({
        pathname: '/filters',
        params: {
          ...filters,
          mode,
          scope,
          query: search.value,
          countryId,
          regionId,
        },
      }),
    onResetFilters: () => {
      setSearch({ request: requestedQuery, value: '' });
      router.setParams({ continent: 'all', scope: 'all', query: undefined, countryId: undefined, regionId: undefined });
    },
  };
  if (mode !== 'countries')
    return (
      <PlacesListScreen
        {...sharedProps}
        mode={mode}
        countryId={countryId}
        regionId={regionId}
        continent={filters.continent}
        onSelect={(place) => router.navigate(placeHref(place, scope))}
      />
    );
  return (
    <CountriesScreen
      {...sharedProps}
      filters={filters}
      onSelect={selectCountry}
      onOpenRegions={(id) => router.push(regionsHref(id))}
    />
  );
}
