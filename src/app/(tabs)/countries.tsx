import { router, useLocalSearchParams } from 'expo-router';

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
  const filters = readCountryFilters({
    continent: params.continent,
    grouping: data.preferences.countryGrouping,
  });
  return (
    <CountriesScreen
      filters={filters}
      scope={readCountryScope(params.scope)}
      query={typeof params.query === 'string' ? params.query : ''}
      intent={typeof params.intent === 'string' ? params.intent : undefined}
      onQueryChange={(query) => router.setParams({ query })}
      onScopeChange={(scope) => router.setParams({ scope })}
      onOpenFilters={() =>
        router.push({
          pathname: '/filters',
          params: {
            ...filters,
            scope: readCountryScope(params.scope),
            query: params.query ?? '',
          },
        })
      }
      onResetFilters={() =>
        router.setParams({ continent: 'all', scope: 'all', query: '' })
      }
      onSelect={(id) =>
        router.push({ pathname: '/country/[id]', params: { id } })
      }
    />
  );
}
