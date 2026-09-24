import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { UndoNotice } from '../components/UndoNotice';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { isVisited } from '../data/model';
import { pickBackup, shareBackup } from '../settings/backup-files';
import {
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from '../settings/SettingsSection';
import { theme } from '../theme';

function confirm(
  title: string,
  message: string,
  action: string,
): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
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
  const [working, setWorking] = useState(false);
  const disabled = status !== 'ready' || busy || working;
  const prefs = data.preferences;

  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setWorking(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(
        'Could not finish',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      running.current = false;
      setWorking(false);
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
      : 'None';
    if (
      await confirm(
        'Replace with this backup?',
        `${visited} visited · ${lived} lived · ${wishlist} wishlist\nHome: ${home}\n\nReplaces your places, home, and settings. Cannot be undone.`,
        'Replace data',
      )
    ) {
      await restore(backup);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <DataFeedback />
        <SettingsSection title="Map">
          <ChoiceRow
            label="Globe"
            selected={prefs.mapView === 'globe'}
            disabled={disabled}
            onPress={() => updatePreferences({ mapView: 'globe' })}
          />
          <ChoiceRow
            label="World map"
            selected={prefs.mapView === 'map'}
            disabled={disabled}
            onPress={() => updatePreferences({ mapView: 'map' })}
          />
          <SettingsToggle
            title="Country labels"
            value={prefs.countryLabels}
            disabled={disabled}
            onChange={(countryLabels) => updatePreferences({ countryLabels })}
          />
          <SettingsToggle
            title="Travel summary"
            value={prefs.mapSummary}
            disabled={disabled}
            onChange={(mapSummary) => updatePreferences({ mapSummary })}
          />
        </SettingsSection>
        <SettingsSection
          title="Home"
          description="Home counts as Lived and Visited. Former homes stay Lived."
        >
          <SettingsRow
            title="Current home"
            disclosure
            value={
              data.homeCountryId
                ? countryById.get(data.homeCountryId)?.name
                : 'Choose a country'
            }
            disabled={disabled}
            onPress={() => onOpen('home')}
          />
        </SettingsSection>
        <SettingsSection title="Country list">
          <ChoiceRow
            label="By continent"
            selected={prefs.countryGrouping === 'continent'}
            disabled={disabled}
            onPress={() => updatePreferences({ countryGrouping: 'continent' })}
          />
          <ChoiceRow
            label="Alphabetical"
            selected={prefs.countryGrouping === 'alphabetical'}
            disabled={disabled}
            onPress={() =>
              updatePreferences({ countryGrouping: 'alphabetical' })
            }
          />
        </SettingsSection>
        <SettingsSection title="Feedback">
          <SettingsToggle
            title="Haptics"
            value={prefs.haptics}
            disabled={disabled}
            onChange={(haptics) => updatePreferences({ haptics })}
          />
        </SettingsSection>
        <SettingsSection
          title="Your data"
          description="Saved on this device. Export a backup to keep a copy."
        >
          <SettingsRow
            title="Export backup"
            value="Places, home, and settings"
            disabled={disabled}
            onPress={() => void run(() => shareBackup(data))}
          />
          <SettingsRow
            title="Restore backup"
            value="Preview, then replace your data"
            disabled={busy || working || status === 'loading'}
            onPress={() => void run(importBackup)}
          />
          <SettingsRow
            title="Clear travel data"
            destructive
            disabled={disabled}
            onPress={() =>
              void run(async () => {
                if (
                  await confirm(
                    'Clear all travel data?',
                    'Removes all places and home. Keeps your settings. Cannot be undone.',
                    'Clear travel data',
                  )
                )
                  await clearTravel();
              })
            }
          />
          <SettingsRow
            title="Reset preferences"
            disabled={disabled}
            onPress={() =>
              void run(async () => {
                if (
                  await confirm(
                    'Reset preferences?',
                    'Resets settings to defaults. Keeps your places and home.',
                    'Reset preferences',
                  )
                )
                  resetPreferences();
              })
            }
          />
        </SettingsSection>
        <UndoNotice />
        <SettingsSection title="App">
          <SettingsRow
            title="About"
            disclosure
            onPress={() => onOpen('about')}
          />
          <SettingsRow
            title="Open-source licenses"
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
