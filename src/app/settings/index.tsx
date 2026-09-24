import { router } from 'expo-router';

import { SettingsScreen } from '../../screens/SettingsScreen';

export default function SettingsRoute() {
  return <SettingsScreen onOpen={(page) => router.push(`/settings/${page}`)} />;
}
