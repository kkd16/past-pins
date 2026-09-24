import { Stack } from 'expo-router';

import { theme } from '../../theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.background },
        headerTintColor: theme.color.accent,
        headerTitleStyle: { color: theme.color.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.color.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="home" options={{ title: 'Current home' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="help" options={{ title: 'Help & controls' }} />
      <Stack.Screen name="credits" options={{ title: 'Credits' }} />
      <Stack.Screen
        name="licenses"
        options={{ title: 'Open-source licenses' }}
      />
      <Stack.Screen name="license" options={{ title: 'License' }} />
    </Stack>
  );
}
