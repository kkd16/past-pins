import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { readCountryFilters, readCountryScope } from '../../countries/filters';
import { useAppData } from '../../data/AppDataProvider';
import { CountriesScreen } from '../../screens/CountriesScreen';

export default function CountriesRoute() {
  const params = useLocalSearchParams<{
    continent?: string;
    scope?: string;
    query?: string;
    intent?: string;
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
  return (
    <CountriesScreen
      filters={filters}
      scope={readCountryScope(params.scope)}
      query={search.value}
      intent={intent}
      onQueryChange={(value) => setSearch({ request: requestedQuery, value })}
      onScopeChange={(scope) => router.setParams({ scope })}
      onOpenFilters={() =>
        router.push({
          pathname: '/filters',
          params: {
            ...filters,
            scope: readCountryScope(params.scope),
            query: search.value,
          },
        })
      }
      onResetFilters={() => {
        setSearch({ request: requestedQuery, value: '' });
        router.setParams({ continent: 'all', scope: 'all', query: undefined });
      }}
      onSelect={selectCountry}
      onOpenRegions={() => router.push('/regions')}
    />
  );
}
