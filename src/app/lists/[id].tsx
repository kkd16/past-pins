import { router, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/AppDataProvider';
import { ListDetailsScreen } from '../../screens/ListDetailsScreen';
import { placeHref, regionsHref } from '../../places/navigation';

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
      onShare={() => router.push({ pathname: '/share', params: { kind: 'list', id } })}
      onOpenRegions={(countryId) => router.push(regionsHref(countryId))}
      onOpenPlace={(place) => router.push(placeHref(place))}
    />
  );
}
