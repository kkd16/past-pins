import { router, useLocalSearchParams } from 'expo-router';

import { readCountryFilters } from '../countries/filters';
import { CountryFiltersScreen } from '../screens/CountryFiltersScreen';

export default function CountryFiltersRoute() {
  return (
    <CountryFiltersScreen
      initialFilters={readCountryFilters(useLocalSearchParams())}
      onApply={(filters) =>
        router.dismissTo({ pathname: '/countries', params: filters })
      }
    />
  );
}
