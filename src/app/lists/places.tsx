import { router, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { ListPlacesScreen } from '../../screens/ListPlacesScreen';

export default function ListPlacesRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { resetVersion } = useAppData();
  return (
    <ListPlacesScreen
      key={`${id}:${resetVersion}`}
      id={id}
      onDone={() => router.back()}
      onCancel={() => router.back()}
    />
  );
}
