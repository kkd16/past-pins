import { router } from 'expo-router';

import { placeHref, placesHref } from '../../places/navigation';
import { StatsScreen } from '../../screens/StatsScreen';

export default function StatsRoute() {
  return (
    <StatsScreen
      onOpenSettings={() => router.push('/settings')}
      onOpenRegions={(scope) =>
        router.navigate(placesHref('regions', scope))
      }
      onOpenCities={(scope) => router.navigate(placesHref('cities', scope))}
      onOpenStamps={() => router.push('/stamps')}
      onShare={() => router.push({ pathname: '/share', params: { kind: 'world' } })}
      onChooseHome={() => router.push('/settings/home')}
      onOpenCountries={(scope, continent) =>
        router.navigate(placesHref('countries', scope, continent))
      }
      onOpenHome={(place) => router.navigate(placeHref(place))}
    />
  );
}
