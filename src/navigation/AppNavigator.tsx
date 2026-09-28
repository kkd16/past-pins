import { Stack } from 'expo-router';

import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { appData as store } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { RecoveryScreen } from '../recovery/RecoveryScreen';
import { t } from '../localization';
import { useStackScreenOptions } from './useStackScreenOptions';

const modalOptions = { presentation: 'modal', headerShown: false } as const;
const sheetOptions = {
  presentation: 'formSheet', headerShown: false, sheetGrabberVisible: true,
} as const;

export function AppNavigator() {
  const status = useAppData((snapshot) => snapshot.status);
  const onboardingCompleted = useAppData((snapshot) => snapshot.data.onboardingCompleted);
  const screenOptions = useStackScreenOptions();
  if (status === 'loading') return <Screen><DataFeedback /></Screen>;

  if (status === 'load-error') return <RecoveryScreen store={store} />;

  const welcome = status === 'ready' && !onboardingCompleted;
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Protected guard={!welcome}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('common.appName') }} />
        <Stack.Screen name="settings/index" options={{ title: t('common.settings') }} />
        <Stack.Screen name="settings/home" options={{ title: t('common.currentHome') }} />
        <Stack.Screen name="settings/about" options={{ title: t('common.about') }} />
        <Stack.Screen name="settings/licenses" options={{ title: t('common.licenses') }} />
        <Stack.Screen name="settings/license" options={{ title: t('common.license') }} />
        <Stack.Screen name="map-search" options={{ ...sheetOptions, sheetAllowedDetents: [1] }} />
        <Stack.Screen name="share" options={modalOptions} />
        <Stack.Screen name="stamps/index" options={{ title: t('stamps.title') }} />
        <Stack.Screen name="stamps/[id]" options={modalOptions} />
        <Stack.Screen name="lists/[id]" options={{ title: t('lists.title') }} />
        <Stack.Screen
          name="lists/places"
          options={{ title: t('lists.editPlaces'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="lists/add"
          options={{ title: t('lists.saveToLists'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="regions/[id]"
          options={{ title: t('subdivisions.title'), presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="country/[id]"
          options={{ ...sheetOptions, sheetAllowedDetents: [0.65, 1] }}
        />
        <Stack.Screen
          name="place-location"
          options={{ ...sheetOptions, sheetAllowedDetents: [1] }}
        />
      </Stack.Protected>
      <Stack.Protected guard={welcome}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="recovery" options={{ title: t('recovery.title') }} />
    </Stack>
  );
}
