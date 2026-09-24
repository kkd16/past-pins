import { router } from 'expo-router';

import { LicensesScreen } from '../../screens/LicensesScreen';

export default function LicensesRoute() {
  return (
    <LicensesScreen
      onSelect={(name, version) =>
        router.push({
          pathname: '/settings/license',
          params: { name, version },
        })
      }
    />
  );
}
