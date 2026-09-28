import { router, useLocalSearchParams } from 'expo-router';

import { locationForMode, locationParam, readPlaceLocation, readPlacesMode } from '../places/location';
import { PlaceLocationScreen } from '../screens/PlaceLocationScreen';

export default function PlaceLocationRoute() {
  const params = useLocalSearchParams<{ location?: string; mode?: string; target?: string; id?: string; created?: string; scope?: string; query?: string }>();
  const mode = readPlacesMode(params.mode);
  return <PlaceLocationScreen
    mode={mode}
    location={locationForMode(readPlaceLocation(params.location), mode)}
    onDismiss={() => router.back()}
    onSelect={(location) => {
      const selection = { mode, location: locationParam(location) };
      router.dismissTo(params.target === 'list' && typeof params.id === 'string'
        ? { pathname: '/lists/places', params: { ...selection, id: params.id, created: params.created } }
        : { pathname: '/countries', params: { ...selection, scope: params.scope, query: params.query } });
    }}
  />;
}
