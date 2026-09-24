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
  onOpen: (page: 'home' | 'about' | 'help' | 'credits' | 'licenses') => void;
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
        `${visited} visited · ${lived} lived · ${wishlist} wishlist\nHome: ${home}\n\nThis replaces all your places, home, and settings. It cannot be undone.`,
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
        <SettingsSection
          title="Your atlas"
          description="The view you choose on the map is remembered here too."
        >
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
            title="Travel summary on map"
            value={prefs.mapSummary}
            disabled={disabled}
            onChange={(mapSummary) => updatePreferences({ mapSummary })}
          />
        </SettingsSection>
        <SettingsSection
          title="Your places"
          description="Current home counts as Lived and Visited. Former homes stay in Lived."
        >
          <SettingsRow
            title="Current home"
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
            label="Group by continent"
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
          description="Your places are saved on this device. Export a backup to keep a copy in Files or move it to another device."
        >
          <SettingsRow
            title="Export backup"
            value={working ? 'Working…' : 'Places, home, and settings'}
            disabled={disabled}
            onPress={() => void run(() => shareBackup(data))}
          />
          <SettingsRow
            title="Restore backup"
            value="Preview a backup before replacing your data"
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
                    'This removes Visited, Wishlist, Lived, and your current home. Your settings stay the same. It cannot be undone.',
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
                    'Restore the default map, labels, summary, grouping, and haptics. Your travel data and home stay the same.',
                    'Reset preferences',
                  )
                )
                  resetPreferences();
              })
            }
          />
        </SettingsSection>
        <UndoNotice />
        <SettingsSection title="About Past Pins">
          <SettingsRow title="Help & controls" onPress={() => onOpen('help')} />
          <SettingsRow title="About" onPress={() => onOpen('about')} />
          <SettingsRow
            title="Credits & map sources"
            onPress={() => onOpen('credits')}
          />
          <SettingsRow
            title="Open-source licenses"
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
