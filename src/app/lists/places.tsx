import { router, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/AppData';
import { ListPlacesScreen } from '../../screens/ListPlacesScreen';
import { locationForMode, locationParam, readPlaceLocation, readPlacesMode } from '../../places/location';

export default function ListPlacesRoute() {
  const params = useLocalSearchParams<{ id: string; created?: string; mode?: string; location?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const created = params.created === '1';
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const mode = readPlacesMode(params.mode);
  const location = locationForMode(readPlaceLocation(params.location), mode);
  return (
    <ListPlacesScreen
      key={`${id}:${resetVersion}`}
      id={id}
      mode={mode}
      location={location}
      onModeChange={(next) => router.setParams({ mode: next, location: locationParam(locationForMode(location, next)) })}
      onBrowseCountry={(countryId) => router.setParams({ mode: 'cities', location: countryId })}
      onOpenLocation={() => router.push({ pathname: '/place-location', params: {
        target: 'list', id, created: params.created, mode, location: locationParam(location),
      } })}
      onDone={() =>
        created
          ? router.replace({ pathname: '/lists/[id]', params: { id } })
          : router.back()
      }
      onCancel={() => (created ? router.dismissTo('/lists') : router.back())}
    />
  );
}
