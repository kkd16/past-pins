import { useLocalSearchParams } from 'expo-router';

import { LicenseScreen } from '../../screens/LicensesScreen';

export default function LicenseRoute() {
  const { name = '', version = '' } = useLocalSearchParams<{
    name?: string;
    version?: string;
  }>();
  return <LicenseScreen name={name} version={version} />;
}
