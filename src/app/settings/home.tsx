import { t } from '../../localization';
import { router } from 'expo-router';

import { appData } from '../../data/app-data';
import { useAppData } from '../../data/AppData';
import { PlaceSearchScreen } from '../../screens/PlaceSearchScreen';

export default function HomeRoute() {
  const { setHome } = appData;
  const homePlaceId = useAppData((snapshot) => snapshot.data.homePlaceId);
  function choose(id: string | null) {
    setHome(id);
    router.back();
  }
  return (
    <PlaceSearchScreen
      title={t('common.currentHome')}
      onSelect={choose}
      onClear={homePlaceId ? () => choose(null) : undefined}
    />
  );
}
