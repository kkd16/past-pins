import { router, useLocalSearchParams } from 'expo-router';

import { readCountryFilters } from '../countries/filters';
import { useAppData } from '../data/AppDataProvider';
import { CountryFiltersScreen } from '../screens/CountryFiltersScreen';

export default function CountryFiltersRoute() {
  const { updatePreferences } = useAppData();
  const params = useLocalSearchParams<{
    continent?: string;
    grouping?: string;
    scope?: string;
    query?: string;
    mode?: string;
  }>();
  return (
    <CountryFiltersScreen
      initialFilters={readCountryFilters(params)}
      showGrouping={params.mode !== 'regions'}
      onCancel={() => router.back()}
      onApply={(filters) => {
        if (params.mode !== 'regions')
          updatePreferences({ countryGrouping: filters.grouping });
        router.dismissTo({
          pathname: '/countries',
          params: {
            continent: filters.continent,
            scope: params.scope,
            query: params.query,
            mode: params.mode === 'regions' ? 'regions' : 'countries',
          },
        });
      }}
    />
  );
}
