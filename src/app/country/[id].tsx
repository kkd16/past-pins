import { router, useLocalSearchParams } from 'expo-router';

import { CountryDetailsScreen } from '../../screens/CountryDetailsScreen';

export default function CountryDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <CountryDetailsScreen
      id={id}
      onDone={() => router.back()}
      onOpenStamp={(countryId) =>
        router.push({ pathname: '/stamps/[id]', params: { id: countryId } })
      }
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
