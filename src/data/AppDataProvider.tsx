import * as Haptics from 'expo-haptics';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import { countryById } from '../countries/catalog';
import { appStorage } from '../storage/app-storage';
import type { AppStorage } from '../storage/snapshot-storage';
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
      'Clear current home?',
      `${countryById.get(id)?.name ?? 'This place'} will no longer be marked as your current home.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Update place', onPress: () => resolve(true) },
      ],
    );
  });
}

export function AppDataProvider({
  storage = appStorage,
  children,
}: {
  storage?: AppStorage;
  children: ReactNode;
}) {
  const store = useMemo(
    () =>
      createAppDataStore(storage, {
        confirmHomeChange,
        feedback: (enabled) => {
          if (enabled) void Haptics.selectionAsync().catch(() => undefined);
        },
      }),
    [storage],
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.load();
  }, [store]);
  const announcement =
    snapshot.status === 'load-error'
      ? 'Could not load your data. Use Try again to retry.'
      : snapshot.saveError
        ? 'Your latest changes haven’t been saved. Use Retry save to try again.'
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
