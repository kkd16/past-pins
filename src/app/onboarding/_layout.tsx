import { Stack } from 'expo-router';

import { useStackScreenOptions } from '../../navigation/useStackScreenOptions';

export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, title: '' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="location" />
      <Stack.Screen name="background" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
