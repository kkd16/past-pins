import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { VisitsProvider } from '../countries/VisitsProvider';
import { visitStorage } from '../storage/visits';
import { theme } from '../theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  useEffect(() => {
    Appearance.setColorScheme('dark');
  }, []);

  return (
    <VisitsProvider storage={visitStorage}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="country/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.4, 1],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="filters"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.7, 1],
            sheetGrabberVisible: true,
          }}
        />
      </Stack>
    </VisitsProvider>
  );
}
