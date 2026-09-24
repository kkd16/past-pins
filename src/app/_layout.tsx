import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDataProvider } from '../data/AppDataProvider';
import { theme } from '../theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  useEffect(() => {
    Appearance.setColorScheme(theme.appearance.colorScheme);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppDataProvider>
        <StatusBar style={theme.appearance.statusBarStyle} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.color.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="map-search" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="country/[id]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.65, 1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="filters"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.7],
              sheetGrabberVisible: true,
            }}
          />
        </Stack>
      </AppDataProvider>
    </GestureHandlerRootView>
  );
}
