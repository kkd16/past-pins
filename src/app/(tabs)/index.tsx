import { router } from 'expo-router';

import { MapScreen } from '../../screens/MapScreen';

export default function MapRoute() {
  return (
    <MapScreen
      onSelect={(id) =>
        router.push({ pathname: '/country/[id]', params: { id } })
      }
      onOpenCountries={() => router.navigate('/countries')}
    />
  );
}
