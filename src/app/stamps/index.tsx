import { router } from 'expo-router';

import { useAppData } from '../../data/AppData';
import { countryHref, placesHref } from '../../places/navigation';
import { StampsScreen } from '../../screens/StampsScreen';

export default function StampsRoute() {
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  return (
    <StampsScreen
      key={resetVersion}
      onSelect={(id) => router.push(countryHref(id))}
      onBrowseCountries={() =>
        router.dismissTo(placesHref('countries'))
      }
    />
  );
}
