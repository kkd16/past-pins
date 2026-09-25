import { router, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { ListPlacesScreen } from '../../screens/ListPlacesScreen';

export default function ListPlacesRoute() {
  const params = useLocalSearchParams<{ id: string; created?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const created = params.created === '1';
  const { resetVersion } = useAppData();
  return (
    <ListPlacesScreen
      key={`${id}:${resetVersion}`}
      id={id}
      onDone={() =>
        created
          ? router.replace({ pathname: '/lists/[id]', params: { id } })
          : router.back()
      }
      onCancel={() => (created ? router.dismissTo('/lists') : router.back())}
    />
  );
}
