import { router } from 'expo-router';

import { t } from '../localization';
import { PlaceSearchScreen } from '../screens/PlaceSearchScreen';
import { getPlace } from '../places/catalog';
import { placeHref, worldMapHref } from '../places/navigation';

export default function MapSearchRoute() {
  return (
    <PlaceSearchScreen
      title={t('places.searchTitle')}
      onCancel={() => router.back()}
      onSelect={(id) => {
        const place = getPlace(id);
        if (!place) return;
        if (place.kind === 'region') {
          router.replace(placeHref(place));
        } else router.dismissTo(worldMapHref(place.id));
      }}
    />
  );
}
