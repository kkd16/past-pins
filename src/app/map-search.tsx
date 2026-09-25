import { router } from 'expo-router';

import { t } from '../localization';
import { PlaceSearchScreen } from '../screens/PlaceSearchScreen';
import { getPlace } from '../places/catalog';

export default function MapSearchRoute() {
  return (
    <PlaceSearchScreen
      title={t('places.searchTitle')}
      onCancel={() => router.back()}
      onSelect={(id) => {
        const place = getPlace(id);
        if (!place) return;
        if (place.kind === 'region') {
          router.replace({
            pathname: '/regions/[id]',
            params: { id: place.countryId, focus: place.id },
          });
        } else
          router.dismissTo({
            pathname: '/',
            params: { focus: place.id, focusRequest: String(Date.now()) },
          });
      }}
    />
  );
}
