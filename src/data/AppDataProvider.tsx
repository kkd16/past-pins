import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AccessibilityInfo } from 'react-native';

import { t } from '../localization';
import { appData as store } from './app-data';
import type { DataSnapshot } from './store';

type AppDataContextValue = DataSnapshot &
  Omit<
    typeof store,
    'getSnapshot' | 'subscribe' | 'load'
  >;
const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.load();
  }, []);
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
  const value = useMemo(() => ({ ...store, ...snapshot }), [snapshot]);
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
