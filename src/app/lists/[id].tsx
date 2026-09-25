import { router, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { ListDetailsScreen } from '../../screens/ListDetailsScreen';

export default function ListDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { resetVersion } = useAppData();
  return (
    <ListDetailsScreen
      key={`${id}:${resetVersion}`}
      id={id}
      onEdit={() => router.push({ pathname: '/lists/places', params: { id } })}
      onBrowse={() => router.dismissTo('/lists')}
      onOpenRegions={(countryId) =>
        router.push({ pathname: '/regions/[id]', params: { id: countryId } })
      }
      onOpenPlace={(place) =>
        place.kind === 'country'
          ? router.push({ pathname: '/country/[id]', params: { id: place.id } })
          : router.push({
              pathname: '/regions/[id]',
              params: { id: place.countryId, focus: place.id },
            })
      }
    />
  );
}
