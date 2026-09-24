import { router, useLocalSearchParams } from 'expo-router';

import { CountryDetailsScreen } from '../../screens/CountryDetailsScreen';

export default function CountryDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CountryDetailsScreen
      id={id}
      onDone={() => router.back()}
      onShowMap={(focus) =>
        router.dismissTo({ pathname: '/', params: { focus } })
      }
    />
  );
}
