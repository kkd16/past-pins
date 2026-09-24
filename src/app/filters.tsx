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
  }>();
  return (
    <CountryFiltersScreen
      initialFilters={readCountryFilters(params)}
      onCancel={() => router.back()}
      onApply={(filters) => {
        updatePreferences({ countryGrouping: filters.grouping });
        router.dismissTo({
          pathname: '/countries',
          params: {
            continent: filters.continent,
            scope: params.scope,
            query: params.query,
          },
        });
      }}
    />
  );
}
