import * as Haptics from 'expo-haptics';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import { countryById } from '../countries/catalog';
import { t } from '../localization';
import { appStorage } from '../storage/app-storage';
import { createAppDataStore, type DataSnapshot } from './store';

type AppDataContextValue = DataSnapshot &
  Omit<
    ReturnType<typeof createAppDataStore>,
    'getSnapshot' | 'subscribe' | 'load'
  >;
const AppDataContext = createContext<AppDataContextValue | null>(null);

function confirmHomeChange(id: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      t('common.clearHomeTitle'),
      t('common.clearHomeMessage', {
        country: countryById.get(id)?.name ?? t('common.thisPlace'),
      }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        { text: t('common.updatePlace'), onPress: () => resolve(true) },
      ],
    );
  });
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() =>
    createAppDataStore(appStorage, {
      confirmHomeChange,
      feedback: (enabled) => {
        if (enabled) void Haptics.selectionAsync().catch(() => undefined);
      },
    }),
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.load();
  }, [store]);
  const announcement =
    snapshot.status === 'load-error'
      ? t('countries.loadError')
      : snapshot.saveError
        ? t('countries.saveError')
        : null;
  useEffect(() => {
    if (announcement)
      AccessibilityInfo.announceForAccessibilityWithOptions(announcement, {
        queue: true,
      });
  }, [announcement]);
  const value = useMemo(() => ({ ...store, ...snapshot }), [store, snapshot]);
  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value)
    throw new Error('useAppData must be used within AppDataProvider.');
  return value;
}
