import { isRunningInExpoGo } from 'expo';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

import { AppText } from '../components/AppText';
import { InfoPage, InfoSection } from '../settings/InfoPage';

export function AboutScreen() {
  const inExpoGo = isRunningInExpoGo();
  const version = inExpoGo
    ? Constants.expoConfig?.version
    : Application.nativeApplicationVersion;
  const build = inExpoGo ? null : Application.nativeBuildVersion;
  return (
    <InfoPage>
      <InfoSection title="Past Pins">
        A little atlas of your life. Keep track of the places you’ve visited,
        lived, and hope to see next.
      </InfoSection>
      <AppText tone="muted" selectable>
        Version {version ?? 'Unknown'}
        {build ? ` · Build ${build}` : ''}
        {inExpoGo ? ' · Expo Go' : ''}
      </AppText>
      <InfoSection title="Made for your own world">
        Your atlas works offline. No account, location permission, or cloud
        service is needed. Your travel data and settings are stored on this
        device.
      </InfoSection>
      <InfoSection title="Keep a copy">
        Use Export backup in Settings to save your places, home, and
        preferences. Restoring a backup replaces what’s on the device. Deleting
        the app can remove its local data.
      </InfoSection>
      <InfoSection title="Countries & territories">
        Totals follow the places available in the map dataset, including
        countries and territories. The map is a simplified travel reference.
        Names, boundaries, and regional groupings follow its sources.
      </InfoSection>
    </InfoPage>
  );
}
