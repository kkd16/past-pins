import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { ToggleRow } from '../components/ToggleRow';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { recoveryMessage } from '../recovery/error-message';
import { confirmDestructiveAction } from '../feedback/confirmDestructiveAction';
import { useToast } from '../feedback/ToastProvider';
import { formatNumber, t } from '../localization';
import { ArrivalAlertsSetting } from '../location/ArrivalAlertsSetting';
import { useActionGuard } from '../navigation/useActionGuard';
import { pickBackup, shareBackup } from '../settings/backup-files';
import { SettingsRow, SettingsSection } from '../settings/SettingsSection';
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
    data,
    status,
    busy,
    updatePreferences,
    restore,
    clearTravel,
    resetPreferences,
    resetApp,
  } = useAppData();
  const running = useRef(false);
  const guard = useActionGuard(data);
  const [operation, setOperation] = useState<DataAction | null>(null);
  const working = operation !== null;
  const disabled = status !== 'ready' || busy || working;
  const recoveryDisabled = status === 'loading' || busy || working;
  const prefs = data.preferences;
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
    const home = backup.homeCountryId
      ? countryById.get(backup.homeCountryId)!.name
      : t('common.none');
    if (
      await confirmDestructiveAction(
        t('settings.replaceTitle'),
        t('settings.replaceSummary', {
          countries: formatNumber(Object.keys(backup.places).length),
          regions: formatNumber(Object.keys(backup.subdivisions).length),
          lists: formatNumber(backup.lists.length),
          home,
        }),
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
            value={
              data.homeCountryId
                ? countryById.get(data.homeCountryId)?.name
                : t('settings.chooseCountry')
            }
            disabled={disabled}
            onPress={() => onOpen('home')}
          />
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
