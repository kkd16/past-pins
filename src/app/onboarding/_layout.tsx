import { Stack } from 'expo-router';

import { t } from '../../localization';
import { useStackScreenOptions } from '../../navigation/useStackScreenOptions';

export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="reminders" options={{ title: t('location.arrivalSettingsTitle') }} />
    </Stack>
  );
}
