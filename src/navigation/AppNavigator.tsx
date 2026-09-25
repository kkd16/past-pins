import { Stack } from 'expo-router';

import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { useAppData } from '../data/AppDataProvider';
import { t } from '../localization';
import { useStackScreenOptions } from './useStackScreenOptions';

const modalOptions = { presentation: 'modal', headerShown: false } as const;
const sheetOptions = {
  presentation: 'formSheet', headerShown: false, sheetGrabberVisible: true,
} as const;

export function AppNavigator() {
  const { status, data } = useAppData();
  const screenOptions = useStackScreenOptions();
  if (status === 'loading') return <Screen><DataFeedback /></Screen>;

  // Keep Settings available for restore/reset if the stored snapshot is unreadable.
  const welcome = status === 'ready' && !data.onboardingCompleted;
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Protected guard={!welcome}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('common.appName') }} />
        <Stack.Screen name="settings/index" options={{ title: t('common.settings') }} />
        <Stack.Screen name="settings/home" options={{ title: t('common.currentHome') }} />
        <Stack.Screen name="settings/about" options={{ title: t('common.about') }} />
        <Stack.Screen name="settings/licenses" options={{ title: t('common.licenses') }} />
        <Stack.Screen name="settings/license" options={{ title: t('common.license') }} />
        <Stack.Screen name="map-search" options={modalOptions} />
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
          name="filters"
          options={{ ...sheetOptions, sheetAllowedDetents: [0.7, 1] }}
        />
      </Stack.Protected>
      <Stack.Protected guard={welcome}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
