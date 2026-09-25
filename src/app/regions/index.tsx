import { router } from 'expo-router';

import { SubdivisionCountriesScreen } from '../../screens/SubdivisionCountriesScreen';

export default function SubdivisionCountriesRoute() {
  return (
    <SubdivisionCountriesScreen
      onSelect={(id) =>
        router.push({ pathname: '/regions/[id]', params: { id } })
      }
    />
  );
}
