import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { placesHref, regionsHref } from '../../places/navigation';
import { MapScreen } from '../../screens/MapScreen';

export default function MapRoute() {
  const params = useLocalSearchParams<{
    focus?: string;
    focusRequest?: string;
  }>();
  const consumeFocus = useCallback(
    () => router.setParams({ focus: undefined, focusRequest: undefined }),
    [],
  );
  return (
    <MapScreen
      focus={typeof params.focus === 'string' ? params.focus : undefined}
      focusRequest={
        typeof params.focusRequest === 'string'
          ? params.focusRequest
          : undefined
      }
      onFocusConsumed={consumeFocus}
      onOpenCountries={() => router.navigate(placesHref('countries'))}
      onOpenRegions={(id) => router.push(regionsHref(id))}
      onSearch={() => router.push('/map-search')}
      onShare={() =>
        router.push({ pathname: '/share', params: { kind: 'world' } })
      }
      onSaveToLists={(placeId) =>
        router.push({ pathname: '/lists/add', params: { placeId } })
      }
      onShareStamp={(id) =>
        router.push({ pathname: '/share', params: { kind: 'stamp', id } })
      }
      onEnlargeStamp={(id) =>
        router.push({ pathname: '/stamps/[id]', params: { id } })
      }
    />
  );
}
