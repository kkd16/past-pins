import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Keyboard } from 'react-native';

import { readCountryScope, type CountryScope } from '../../countries/filters';
import { CountriesScreen } from '../../screens/CountriesScreen';
import { PlacesListScreen } from '../../screens/PlacesListScreen';
import { locationForMode, locationParam, readPlaceLocation, readPlacesMode } from '../../places/location';
import { countryHref, placeHref, regionsHref } from '../../places/navigation';
import type { PlacesMode } from '../../places/PlaceKindControl';

export default function CountriesRoute() {
  const params = useLocalSearchParams<{
    location?: string;
    scope?: string;
    query?: string;
    intent?: string;
    mode?: string;
  }>();
  const query = typeof params.query === 'string' ? params.query : '';
  const intent = typeof params.intent === 'string' ? params.intent : undefined;
  const selectCountry = useCallback(
    (id: string) => router.push(countryHref(id)),
    [],
  );
  const mode = readPlacesMode(params.mode);
  const location = locationForMode(readPlaceLocation(params.location), mode);
  const scope = readCountryScope(params.scope);
  const sharedProps = {
    scope,
    query,
    intent,
    location,
    onQueryChange: (query: string) => router.setParams({ query }),
    onScopeChange: (scope: CountryScope) => router.setParams({ scope }),
    onModeChange: (mode: PlacesMode) => {
      Keyboard.dismiss();
      router.setParams({ mode, location: locationParam(locationForMode(location, mode)) });
    },
    onOpenLocation: () =>
      router.push({
        pathname: '/place-location',
        params: {
          location: locationParam(location),
          mode,
          scope,
          query,
        },
      }),
    onResetFilters: () => router.setParams({ location: 'anywhere', scope: 'all', query: '' }),
  };
  if (mode !== 'countries')
    return (
      <PlacesListScreen
        {...sharedProps}
        mode={mode}
        onSelect={(place) => router.navigate(placeHref(place, scope))}
      />
    );
  return (
    <CountriesScreen
      {...sharedProps}
      onSelect={selectCountry}
      onOpenRegions={(id) => router.push(regionsHref(id))}
    />
  );
}
