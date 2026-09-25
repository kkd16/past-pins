import { router } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { placesHref } from '../../places/navigation';
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
        router.dismissTo(placesHref('countries'))
      }
    />
  );
}
