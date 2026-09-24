import { router } from 'expo-router';

import { t } from '../localization';
import { CountrySearchScreen } from '../screens/CountrySearchScreen';

export default function MapSearchRoute() {
  return (
    <CountrySearchScreen
      title={t('countries.search')}
      onCancel={() => router.back()}
      onSelect={(focus) =>
        router.dismissTo({
          pathname: '/',
          params: { focus, focusRequest: Date.now().toString() },
        })
      }
    />
  );
}
