import { router } from 'expo-router';

import { StatsScreen } from '../../screens/StatsScreen';

export default function StatsRoute() {
  return (
    <StatsScreen
      onOpenSettings={() => router.push('/settings')}
      onOpenRegions={() => router.push('/regions')}
      onOpenStamps={() => router.push('/stamps')}
      onChooseHome={() => router.push('/settings/home')}
      onOpenCountries={(scope, continent = 'all') =>
        router.navigate({
          pathname: '/countries',
          params: { scope, continent, query: '', intent: String(Date.now()) },
        })
      }
      onOpenCountry={(id) =>
        router.push({ pathname: '/country/[id]', params: { id } })
      }
    />
  );
}
