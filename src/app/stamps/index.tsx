import { router } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { StampsScreen } from '../../screens/StampsScreen';

export default function StampsRoute() {
  const { resetVersion } = useAppData();
  return (
    <StampsScreen
      key={resetVersion}
      onSelect={(id) =>
        router.push({ pathname: '/stamps/[id]', params: { id } })
      }
      onBrowseCountries={() =>
        router.dismissTo({
          pathname: '/countries',
          params: {
            scope: 'all',
            continent: 'all',
            query: '',
            intent: String(Date.now()),
          },
        })
      }
    />
  );
}
