import { router, useLocalSearchParams } from 'expo-router';

import { readCountryFilters } from '../countries/filters';
import { appData } from '../data/app-data';
import { CountryFiltersScreen } from '../screens/CountryFiltersScreen';

export default function CountryFiltersRoute() {
  const { updatePreferences } = appData;
  const params = useLocalSearchParams<{
    continent?: string;
    grouping?: string;
    scope?: string;
    query?: string;
    mode?: string;
    countryId?: string;
    regionId?: string;
  }>();
  return (
    <CountryFiltersScreen
      initialFilters={readCountryFilters(params)}
      showGrouping={params.mode !== 'regions' && params.mode !== 'cities'}
      onCancel={() => router.back()}
      onApply={(filters) => {
        if (params.mode !== 'regions' && params.mode !== 'cities')
          updatePreferences({ countryGrouping: filters.grouping });
        router.dismissTo({
          pathname: '/countries',
          params: {
            continent: filters.continent,
            scope: params.scope,
            query: params.query,
            mode: params.mode === 'cities' ? 'cities' : params.mode === 'regions' ? 'regions' : 'countries',
            countryId: params.countryId,
            regionId: params.regionId,
          },
        });
      }}
    />
  );
}
