import { t } from '../localization';
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
            headerStyle: { backgroundColor: theme.color.background },
            headerTintColor: theme.color.accent,
            headerBackButtonDisplayMode: 'minimal',
            headerTitleStyle: { color: theme.color.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.color.background },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false, title: t('common.appName') }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ title: t('common.settings') }}
          />
          <Stack.Screen
            name="settings/home"
            options={{ title: t('common.currentHome') }}
          />
          <Stack.Screen
            name="settings/about"
            options={{ title: t('common.about') }}
          />
          <Stack.Screen
            name="settings/licenses"
            options={{ title: t('common.licenses') }}
          />
          <Stack.Screen
            name="settings/license"
            options={{ title: t('common.license') }}
          />
          <Stack.Screen
            name="map-search"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="country/[id]"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.65, 1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="filters"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.7, 1],
              sheetGrabberVisible: true,
            }}
          />
        </Stack>
      </AppDataProvider>
    </GestureHandlerRootView>
  );
}
