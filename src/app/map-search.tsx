import { router } from 'expo-router';

import { CountrySearchScreen } from '../screens/CountrySearchScreen';

export default function MapSearchRoute() {
  return (
    <CountrySearchScreen
      title="Find a country"
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
