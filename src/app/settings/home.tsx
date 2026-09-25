import { t } from '../../localization';
import { router } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { PlaceSearchScreen } from '../../screens/PlaceSearchScreen';

export default function HomeRoute() {
  const { data, setHome } = useAppData();
  function choose(id: string | null) {
    setHome(id);
    router.back();
  }
  return (
    <PlaceSearchScreen
      countriesOnly
      title={t('common.currentHome')}
      onSelect={choose}
      onClear={data.homeCountryId ? () => choose(null) : undefined}
    />
  );
}
