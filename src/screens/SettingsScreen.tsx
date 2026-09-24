import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { ToggleRow } from '../components/ToggleRow';
import { UndoNotice } from '../components/UndoNotice';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { isVisited } from '../data/model';
import { UserFacingError } from '../data/errors';
import { formatNumber, t } from '../localization';
import { pickBackup, shareBackup } from '../settings/backup-files';
import { SettingsRow, SettingsSection } from '../settings/SettingsSection';
import { theme } from '../theme';

type DataAction = 'export' | 'restore' | 'clear' | 'reset';

function confirm(
  title: string,
  message: string,
  action: string,
): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => resolve(false),
      },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export function SettingsScreen({
  onOpen,
}: {
  onOpen: (page: 'home' | 'about' | 'licenses') => void;
}) {
  const {
    data,
    status,
    busy,
    updatePreferences,
    restore,
    clearTravel,
    resetPreferences,
  } = useAppData();
  const running = useRef(false);
  const [operation, setOperation] = useState<DataAction | null>(null);
  const working = operation !== null;
  const disabled = status !== 'ready' || busy || working;
  const prefs = data.preferences;

  async function run(name: DataAction, action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setOperation(name);
    try {
      await action();
    } catch (error) {
      Alert.alert(
        t('settings.couldNotFinish'),
        error instanceof UserFacingError
          ? error.message
          : t('common.unknownError'),
      );
    } finally {
      running.current = false;
      setOperation(null);
    }
  }

  async function importBackup() {
    const backup = await pickBackup();
    if (!backup) return;
    const statuses = Object.values(backup.places);
    const visited = statuses.filter(isVisited).length;
    const lived = statuses.filter((value) => value === 'lived').length;
    const wishlist = statuses.filter((value) => value === 'wishlist').length;
    const home = backup.homeCountryId
      ? countryById.get(backup.homeCountryId)!.name
      : t('common.none');
    if (
      await confirm(
        t('settings.replaceTitle'),
        t('settings.replaceSummary', {
          visited: formatNumber(visited),
          lived: formatNumber(lived),
          wishlist: formatNumber(wishlist),
          home,
        }),
        t('settings.replaceData'),
      )
    ) {
      await restore(backup);
      Alert.alert(
        t('settings.backupRestored'),
        t('settings.backupRestoredMessage'),
      );
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
        <SettingsSection
          title={t('settings.yourData')}
          description={t('settings.dataDescription')}
        >
          <SettingsRow
            title={t('settings.exportBackup')}
            value={t('settings.backupContents')}
            disabled={disabled}
            busy={operation === 'export'}
            onPress={() => void run('export', () => shareBackup(data))}
          />
          <SettingsRow
            title={t('settings.restoreBackup')}
            value={t('settings.restoreDescription')}
            disabled={busy || working || status === 'loading'}
            busy={operation === 'restore'}
            onPress={() => void run('restore', importBackup)}
          />
          <SettingsRow
            title={t('settings.clearTravel')}
            destructive
            disabled={disabled}
            busy={operation === 'clear'}
            onPress={() =>
              void run('clear', async () => {
                if (
                  await confirm(
                    t('settings.clearTravelTitle'),
                    t('settings.clearTravelMessage'),
                    t('settings.clearTravel'),
                  )
                )
                  await clearTravel();
              })
            }
          />
          <SettingsRow
            title={t('settings.resetPreferences')}
            disabled={disabled}
            busy={operation === 'reset'}
            onPress={() =>
              void run('reset', async () => {
                if (
                  await confirm(
                    t('settings.resetTitle'),
                    t('settings.resetMessage'),
                    t('settings.resetPreferences'),
                  )
                )
                  resetPreferences();
              })
            }
          />
        </SettingsSection>
        <UndoNotice />
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space.xl, paddingBottom: theme.space.xl },
});
