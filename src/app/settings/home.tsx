import { t } from '../../localization';
import { router } from 'expo-router';

import { appData } from '../../data/app-data';
import { useAppData } from '../../data/AppData';
import { PlaceSearchScreen } from '../../screens/PlaceSearchScreen';

export default function HomeRoute() {
  const { setHome } = appData;
  const homeCountryId = useAppData((snapshot) => snapshot.data.homeCountryId);
  function choose(id: string | null) {
    setHome(id);
    router.back();
  }
  return (
    <PlaceSearchScreen
      countriesOnly
      title={t('common.currentHome')}
      onSelect={choose}
      onClear={homeCountryId ? () => choose(null) : undefined}
    />
  );
}
