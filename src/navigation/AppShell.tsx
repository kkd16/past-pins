import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CityCatalogLoader } from '../cities/CityCatalogLoader';
import { AppDataEffects } from '../data/AppData';
import { AppToastHost } from '../feedback/AppToastHost';
import { ToastProvider } from '../feedback/ToastProvider';
import { ReducedMotionProvider } from '../motion/ReducedMotion';
import { CountryArrivalNotifications } from '../location/CountryArrivalNotifications';
import { AppNavigator } from '../navigation/AppNavigator';
import { theme } from '../theme';

export default function AppShell() {
  useEffect(() => {
    Appearance.setColorScheme(theme.appearance.colorScheme);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionProvider>
        <ToastProvider>
          <AppDataEffects />
          <StatusBar style={theme.appearance.statusBarStyle} />
          <CityCatalogLoader />
          <AppNavigator />
          <AppToastHost />
          <CountryArrivalNotifications />
        </ToastProvider>
      </ReducedMotionProvider>
    </GestureHandlerRootView>
  );
}
