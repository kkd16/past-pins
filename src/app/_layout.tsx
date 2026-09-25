import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDataProvider } from '../data/AppDataProvider';
import { AppToastHost } from '../feedback/AppToastHost';
import { ToastProvider } from '../feedback/ToastProvider';
import { ReducedMotionProvider } from '../motion/ReducedMotion';
import { CountryArrivalNotifications } from '../location/CountryArrivalNotifications';
import { AppNavigator } from '../navigation/AppNavigator';
import { theme } from '../theme';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  useEffect(() => {
    Appearance.setColorScheme(theme.appearance.colorScheme);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionProvider>
        <ToastProvider>
          <AppDataProvider>
            <StatusBar style={theme.appearance.statusBarStyle} />
            <AppNavigator />
            <AppToastHost />
            <CountryArrivalNotifications />
          </AppDataProvider>
        </ToastProvider>
      </ReducedMotionProvider>
    </GestureHandlerRootView>
  );
}
