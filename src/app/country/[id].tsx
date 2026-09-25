import { router, useLocalSearchParams } from 'expo-router';

import { CountryDetailsScreen } from '../../screens/CountryDetailsScreen';

export default function CountryDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CountryDetailsScreen
      id={id}
      onDone={() => router.back()}
      onSaveToLists={(placeId) =>
        router.push({ pathname: '/lists/add', params: { placeId } })
      }
      onOpenRegions={(countryId) =>
        router.push({ pathname: '/regions/[id]', params: { id: countryId } })
      }
      onShowMap={(focus) =>
        router.dismissTo({ pathname: '/', params: { focus } })
      }
    />
  );
}
