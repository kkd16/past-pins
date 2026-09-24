import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { MapScreen } from '../../screens/MapScreen';

export default function MapRoute() {
  const { focus, focusRequest } = useLocalSearchParams<{
    focus?: string;
    focusRequest?: string;
  }>();
  const consumeFocus = useCallback(
    () => router.setParams({ focus: undefined, focusRequest: undefined }),
    [],
  );
  return (
    <MapScreen
      focus={focus}
      focusRequest={focusRequest}
      onFocusConsumed={consumeFocus}
      onSelect={(id) =>
        router.push({ pathname: '/country/[id]', params: { id } })
      }
      onOpenCountries={() => router.navigate('/countries')}
      onSearch={() => router.push('/map-search')}
    />
  );
}
