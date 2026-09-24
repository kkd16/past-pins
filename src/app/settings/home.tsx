import { t } from '../../localization';
import { router } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { CountrySearchScreen } from '../../screens/CountrySearchScreen';

export default function HomeRoute() {
  const { data, setHome } = useAppData();
  function choose(id: string | null) {
    setHome(id);
    router.back();
  }
  return (
    <CountrySearchScreen
      title={t('common.currentHome')}
      onSelect={choose}
      onClear={data.homeCountryId ? () => choose(null) : undefined}
    />
  );
}
