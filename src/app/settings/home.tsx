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
      title="Current home"
      onSelect={choose}
      onClear={data.homeCountryId ? () => choose(null) : undefined}
    />
  );
}
