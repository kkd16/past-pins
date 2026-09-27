import { router, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/AppData';
import { PlaceListsScreen } from '../../screens/PlaceListsScreen';

export default function PlaceListsRoute() {
  const params = useLocalSearchParams<{ placeId: string }>();
  const placeId = typeof params.placeId === 'string' ? params.placeId : '';
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  return (
    <PlaceListsScreen
      key={`${placeId}:${resetVersion}`}
      placeId={placeId}
      onDone={() => router.back()}
    />
  );
}
