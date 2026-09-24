import { router, useLocalSearchParams } from 'expo-router';

import {
  defaultCountryFilters,
  readCountryFilters,
} from '../../countries/filters';
import { CountriesScreen } from '../../screens/CountriesScreen';

export default function CountriesRoute() {
  const filters = readCountryFilters(useLocalSearchParams());
  return (
    <CountriesScreen
      filters={filters}
      onOpenFilters={() =>
        router.push({ pathname: '/filters', params: filters })
      }
      onResetFilters={() => router.setParams(defaultCountryFilters)}
      onSelect={(id) =>
        router.push({ pathname: '/country/[id]', params: { id } })
      }
    />
  );
}
