import { router } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { ListsScreen } from '../../screens/ListsScreen';

export default function ListsRoute() {
  const { resetVersion } = useAppData();
  return (
    <ListsScreen
      key={resetVersion}
      onOpen={(id) => router.push({ pathname: '/lists/[id]', params: { id } })}
    />
  );
}
