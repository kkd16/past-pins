import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { ToggleRow } from '../components/ToggleRow';
import { useHome } from '../places/useHome';
import { PlaceFeedback } from '../places/PlaceFeedback';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { recoveryMessage } from '../recovery/error-message';
import { confirmDestructiveAction } from '../feedback/confirmDestructiveAction';
import { useToast } from '../feedback/ToastProvider';
import { t } from '../localization';
import { ArrivalAlertsSetting } from '../location/ArrivalAlertsSetting';
import { useActionGuard } from '../navigation/useActionGuard';
import { pickBackup, shareBackup } from '../settings/backup-files';
import { SettingsRow, SettingsSection } from '../settings/SettingsSection';
import { getBackupSummary } from '../settings/backup-summary';
import { composeSupportEmail } from '../support/compose-email';
import { theme } from '../theme';

type DataAction = 'export' | 'restore' | 'clear' | 'reset' | 'resetApp';

export function SettingsScreen({
  onOpen,
}: {
  onOpen: (page: 'home' | 'about' | 'licenses' | 'recovery') => void;
}) {
  const toast = useToast();
  const { showToast } = toast;
  const {
    updatePreferences,
    restore,
    clearTravel,
    resetPreferences,
    resetApp,
  } = appData;
  const data = useAppData((snapshot) => snapshot.data);
  const status = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const running = useRef(false);
  const guard = useActionGuard(data);
  const [operation, setOperation] = useState<DataAction | null>(null);
  const working = operation !== null;
  const disabled = status !== 'ready' || busy || working;
  const recoveryDisabled = status === 'loading' || busy || working;
  const prefs = data.preferences;
  const home = useHome();
  let homeValue = t('settings.chooseHome');
  if (status !== 'ready') homeValue = t(status === 'load-error' ? 'countries.loadError' : 'countries.loadingPlaces');
  else if (home.id) homeValue = home.name ?? t(home.error ? 'places.loadError' : 'places.loading');
  const resets = [
    {
      name: 'clear',
      label: 'settings.clearTravel',
      title: 'settings.clearTravelTitle',
      message: 'settings.clearTravelMessage',
      action: clearTravel,
      success: 'settings.travelCleared',
    },
    {
      name: 'reset',
      label: 'settings.resetPreferences',
      title: 'settings.resetTitle',
      message: 'settings.resetMessage',
      action: resetPreferences,
      success: 'settings.preferencesReset',
    },
    {
      name: 'resetApp',
      label: 'settings.resetApp',
      title: 'settings.resetAppTitle',
      message: 'settings.resetAppMessage',
      action: resetApp,
      success: null,
    },
  ] as const;

  async function run(name: DataAction, action: () => Promise<void>) {
    const isCurrent = guard();
    if (running.current || busy || status === 'loading' || !isCurrent()) return;
    running.current = true;
    setOperation(name);
    try {
      await action();
    } catch (error) {
      if (isCurrent())
        Alert.alert(
          t('settings.couldNotFinish'),
          recoveryMessage(error),
        );
    } finally {
      running.current = false;
      setOperation(null);
    }
  }

  async function importBackup() {
    const isCurrent = guard();
    const backup = await pickBackup();
    if (!backup || !isCurrent()) return;
    const summary = await getBackupSummary(backup);
    if (!isCurrent()) return;
    if (
      await confirmDestructiveAction(
        t('settings.replaceTitle'),
        summary,
        t('settings.replaceData'),
        isCurrent,
      )
    ) {
      await restore(backup);
      showToast({ message: t('settings.backupRestored') });
    }
  }

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <DataFeedback />
        <SettingsSection title={t('common.map')}>
          <ChoiceRow
            label={t('settings.globe')}
            selected={prefs.mapView === 'globe'}
            disabled={disabled}
            onPress={() => updatePreferences({ mapView: 'globe' })}
          />
          <ChoiceRow
            label={t('settings.worldMap')}
            selected={prefs.mapView === 'map'}
            disabled={disabled}
            onPress={() => updatePreferences({ mapView: 'map' })}
          />
          <ToggleRow
            title={t('settings.countryLabels')}
            value={prefs.countryLabels}
            disabled={disabled}
            onValueChange={(countryLabels) =>
              updatePreferences({ countryLabels })
            }
          />
          <ToggleRow
            title={t('settings.travelSummary')}
            value={prefs.mapSummary}
            disabled={disabled}
            onValueChange={(mapSummary) => updatePreferences({ mapSummary })}
          />
        </SettingsSection>
        <SettingsSection
          title={t('settings.home')}
          description={t('settings.homeDescription')}
        >
          <SettingsRow
            title={t('common.currentHome')}
            disclosure
            value={homeValue}
            disabled={disabled}
            onPress={() => onOpen('home')}
          />
          <PlaceFeedback loading={false} error={home.error} onRetry={home.retry} />
        </SettingsSection>
        <SettingsSection title={t('settings.countryList')}>
          <ChoiceRow
            label={t('settings.byContinent')}
            selected={prefs.countryGrouping === 'continent'}
            disabled={disabled}
            onPress={() => updatePreferences({ countryGrouping: 'continent' })}
          />
          <ChoiceRow
            label={t('settings.alphabetical')}
            selected={prefs.countryGrouping === 'alphabetical'}
            disabled={disabled}
            onPress={() =>
              updatePreferences({ countryGrouping: 'alphabetical' })
            }
          />
        </SettingsSection>
        <SettingsSection title={t('settings.feedback')}>
          <ToggleRow
            title={t('settings.haptics')}
            value={prefs.haptics}
            disabled={disabled}
            onValueChange={(haptics) => updatePreferences({ haptics })}
          />
        </SettingsSection>
        <ArrivalAlertsSetting disabled={disabled} />
        <SettingsSection
          title={t('settings.yourData')}
          description={t('settings.dataDescription')}
        >
          <SettingsRow
            title={t('recovery.title')}
            disclosure
            onPress={() => onOpen('recovery')}
          />
          <SettingsRow
            title={t('settings.exportBackup')}
            disabled={disabled}
            busy={operation === 'export'}
            onPress={() => void run('export', () => shareBackup(data))}
          />
          <SettingsRow
            title={t('settings.restoreBackup')}
            value={t('settings.restoreDescription')}
            disabled={recoveryDisabled}
            busy={operation === 'restore'}
            onPress={() => void run('restore', importBackup)}
          />
        </SettingsSection>
        <SettingsSection title={t('settings.support')}>
          {(['bug', 'feature'] as const).map((kind) => (
            <SettingsRow
              key={kind}
              title={t(`support.${kind}.label`)}
              disabled={recoveryDisabled}
              onPress={() => void composeSupportEmail(kind, guard())}
            />
          ))}
        </SettingsSection>
        <SettingsSection title={t('settings.app')}>
          <SettingsRow
            title={t('common.about')}
            disclosure
            onPress={() => onOpen('about')}
          />
          <SettingsRow
            title={t('common.licenses')}
            disclosure
            onPress={() => onOpen('licenses')}
          />
        </SettingsSection>
        <SettingsSection title={t('settings.resetAppSection')}>
          {resets.map(({ name, label, title, message, action, success }) => (
            <SettingsRow
              key={name}
              title={t(label)}
              destructive={name !== 'reset'}
              disabled={name === 'resetApp' ? recoveryDisabled : disabled}
              busy={operation === name}
              onPress={() => void run(name, async () => {
                if (!await confirmDestructiveAction(t(title), t(message), t(label), guard())) return;
                await action();
                if (success) showToast({ message: t(success) });
                else {
                  const currentToast = toast.getSnapshot();
                  if (currentToast) toast.dismissToast(currentToast.id);
                }
              })}
            />
          ))}
        </SettingsSection>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space.xl, paddingBottom: theme.space.xl },
});
