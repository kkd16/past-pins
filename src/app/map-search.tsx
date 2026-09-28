import { router } from 'expo-router';

import { t } from '../localization';
import { PlaceSearchScreen } from '../screens/PlaceSearchScreen';
import { getPlaceReference } from '../places/catalog';
import { regionsHref, worldMapHref } from '../places/navigation';

export default function MapSearchRoute() {
  return (
    <PlaceSearchScreen
      title={t('places.searchTitle')}
      onCancel={() => router.back()}
      onSelect={(id) => {
        const place = getPlaceReference(id);
        if (!place) return;
        if (place.kind === 'region') {
          router.replace(regionsHref(place.countryId, place.id));
        } else router.dismissTo(worldMapHref(place.id));
      }}
    />
  );
}
