import { useIsFocused } from 'expo-router';

import { appData } from '../data/app-data';
import { RecoveryScreen } from '../recovery/RecoveryScreen';

export default function RecoveryRoute() {
  return <RecoveryScreen store={appData} focused={useIsFocused()} />;
}
