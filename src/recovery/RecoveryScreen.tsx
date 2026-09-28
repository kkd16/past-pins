import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import type { createAppDataStore } from '../data/store';
import { confirmDestructiveAction } from '../feedback/confirmDestructiveAction';
import { formatNumber, t } from '../localization';
import { pickBackup, shareDataFile } from '../settings/backup-files';
import { appStorage } from '../storage/app-storage';
import { getPlaceStatistics } from '../places/statistics';
import { theme } from '../theme';
import { diagnostics } from './diagnostics-file';
import type { DiagnosticOperation } from './diagnostics';
import { recoveryMessage } from './error-message';

export type RecoveryStore = ReturnType<typeof createAppDataStore>;
const noSubscribe = () => () => {};
const noSnapshot = () => null;

export function RecoveryScreen({ store, error, onRetry, focused = true }: {
  store: RecoveryStore | null | undefined;
  error?: unknown;
  onRetry?: () => Promise<void>;
  focused?: boolean;
}) {
  const snapshot = useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.getSnapshot ?? noSnapshot);
  const [working, setWorking] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const running = useRef(false);
  const session = useRef<{ focused: boolean } | null>(null);
  const disabled = store === undefined || working || !!snapshot?.busy || snapshot?.status === 'loading';
  const loadError = snapshot?.loadError;

  useEffect(() => {
    session.current = { focused };
    return () => { session.current = null; };
  }, [focused, store, snapshot?.data, snapshot?.resetVersion]);

  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, [message]);

  function guard() {
    const initial = store?.getSnapshot();
    const origin = session.current;
    return () => origin !== null && origin.focused && session.current === origin &&
      (!store || (store.getSnapshot().data === initial?.data &&
        store.getSnapshot().resetVersion === initial?.resetVersion && !store.getSnapshot().busy));
  }
  async function run(operation: DiagnosticOperation, action: (current: () => boolean) => Promise<void>) {
    const current = guard();
    if (running.current || disabled || !current()) return;
    running.current = true;
    setWorking(true);
    setMessage(null);
    try { await action(current); }
    catch (error) {
      diagnostics.record(operation, error);
      if (current()) Alert.alert(t('settings.couldNotFinish'), recoveryMessage(error));
    } finally {
      running.current = false;
      if (session.current) setWorking(false);
    }
  }
  async function importBackup(current: () => boolean) {
    const data = await pickBackup();
    if (!data || !current()) return;
    const confirmed = await confirmDestructiveAction(t('settings.replaceTitle'), t('recovery.importSummary', {
      countries: formatNumber(getPlaceStatistics(data.places, 'country').saved),
      regions: formatNumber(getPlaceStatistics(data.places, 'region').saved),
      cities: formatNumber(getPlaceStatistics(data.places, 'city').saved),
      lists: formatNumber(data.lists.length),
    }), t('settings.replaceData'), current);
    if (!confirmed) return;
    if (store) await store.restore(data);
    else await appStorage.save(data);
    if (session.current) setMessage(t('recovery.restored'));
  }

  async function resetApp(current: () => boolean) {
    if (!await confirmDestructiveAction(t('settings.resetAppTitle'), t('settings.resetAppMessage'), t('settings.resetApp'), current)) return;
    if (store) await store.resetApp();
    else await appStorage.clear();
    if (session.current) setMessage(t('recovery.resetComplete'));
    await onRetry?.();
  }

  return (
    <SafeAreaProvider style={styles.safe}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="title" accessibilityRole="header">
            {t(loadError ? 'recovery.loadTitle' : error ? 'recovery.crashTitle' : 'recovery.title')}
          </AppText>
          <AppText>{loadError ? recoveryMessage(loadError) : t(error ? 'recovery.crashMessage' : 'recovery.description')}</AppText>
          {!!message && <AppText>{message}</AppText>}
          {(onRetry || snapshot?.status === 'load-error') && (
            <Button label={t('recovery.retry')} disabled={disabled} onPress={() => void run('load', async () => {
              if (store?.getSnapshot().status === 'load-error') await store.load();
              await onRetry?.();
            })} />
          )}
          <Button label={t('settings.restoreBackup')} variant="quiet" disabled={disabled} onPress={() => void run('restore', importBackup)} />
          <Button label={t(showOptions ? 'recovery.fewerOptions' : 'recovery.moreOptions')} variant="quiet"
            accessibilityState={{ expanded: showOptions }} onPress={() => setShowOptions(!showOptions)} />
          {showOptions && <View style={styles.options}>
            <View style={styles.group}>
              <Button label={t('recovery.savedFile')} variant="quiet" disabled={disabled} onPress={() => void run('export', async (current) => {
                const text = await appStorage.readRaw();
                if (!current()) return;
                if (text === null) { setMessage(t('recovery.noSavedFile')); return; }
                await shareDataFile(text, 'Recovery');
              })} />
              <AppText variant="caption">{t('recovery.savedFileDescription')}</AppText>
            </View>
            <View style={styles.group}>
              <Button label={t('recovery.diagnostics')} variant="quiet" disabled={disabled} onPress={() => void run('export', async (current) => {
                const text = await diagnostics.export();
                if (current()) await shareDataFile(text, 'Diagnostics');
              })} />
              <AppText variant="caption">{t('recovery.diagnosticsDescription')}</AppText>
            </View>
            <Button label={t('settings.resetApp')} variant="quiet" disabled={disabled} onPress={() => void run('reset', resetApp)} />
            <View style={styles.group}>
              <AppText variant="label" accessibilityRole="header">{t('recovery.nativeTitle')}</AppText>
              <AppText>{t('recovery.nativeInstructions')}</AppText>
              {Constants.executionEnvironment === ExecutionEnvironment.StoreClient
                ? <AppText>{t('recovery.nativeUnavailable')}</AppText>
                : <Button label={t('recovery.openSettings')} variant="quiet" onPress={() => {
                  void Linking.openSettings().catch(() => Alert.alert(t('settings.couldNotFinish'), t('common.unknownError')));
                }} />}
            </View>
          </View>}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.background },
  content: { gap: theme.space.lg, padding: theme.space.lg, paddingTop: theme.space.xl },
  group: { gap: theme.space.sm },
  options: { gap: theme.space.xl },
});
