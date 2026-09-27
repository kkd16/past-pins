import { useEffect, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import { t } from '../localization';
import { appData } from './app-data';
import type { DataSnapshot } from './store';

export function useAppData<T>(select: (snapshot: DataSnapshot) => T): T {
  return useSyncExternalStore(appData.subscribe, () => select(appData.getSnapshot()));
}

export function AppDataEffects() {
  useEffect(() => {
    void appData.load();
  }, []);
  const announcement = useAppData(({ status, saveError }) =>
    status === 'load-error'
      ? t('countries.loadError')
      : saveError
        ? t('countries.saveError')
        : null,
  );
  useEffect(() => {
    if (announcement)
      AccessibilityInfo.announceForAccessibilityWithOptions(announcement, {
        queue: true,
      });
  }, [announcement]);
  return null;
}
