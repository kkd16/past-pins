import type { DataSnapshot } from '../src/data/store';
import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { act, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { encodeDocument } from '../src/data/document';
import { defaultAppData, defaultPreferences } from '../src/data/model';
import { createToastStore } from '../src/feedback/store';
import { formatNumber, t } from '../src/localization';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';
import { arrivalDatabase, arrivalStorage } from './native-location';
import { backupFile } from './native-sharing';
import { native, navigation } from './setup';

const { appData } = await import('../src/data/app-data');
let toast = createToastStore();
mock.module('../src/feedback/ToastProvider', () => ({ useToast: () => toast }));
mock.module('../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => useSyncExternalStore(appData.subscribe, () => select(appData.getSnapshot())),
}));
mock.module('../src/components/ChoiceRow', () => ({ ChoiceRow: 'ChoiceRow' }));
mock.module('../src/components/ToggleRow', () => ({ ToggleRow: 'ToggleRow' }));
mock.module('../src/components/Screen', () => ({ Screen: 'Screen' }));
mock.module('../src/components/DataFeedback', () => ({ DataFeedback: 'DataFeedback' }));
mock.module('../src/settings/SettingsSection', () => ({ SettingsSection: 'SettingsSection', SettingsRow: 'SettingsRow' }));

const { SettingsScreen } = await import('../src/screens/SettingsScreen');
const resets = [
  ['clear', 'settings.clearTravel'],
  ['preferences', 'settings.resetPreferences'],
  ['app', 'settings.resetApp'],
] as const;
let root: Root;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(async () => {
  await appData.load();
  await appData.resetApp();
  await appData.completeOnboarding(false);
  await appData.setStatus(['fr'], 'visited');
  appData.setHome('ca');
  appData.createList('Trip', ['ca', 'fr']);
  appData.updatePreferences({ haptics: false });
  await arrivalStorage.load();
  toast = createToastStore();
  navigation.focused = true;
  native.Alert.alert.mockReset();
  backupFile.text.mockReset();
  root = createRoot({ isStrictMode: true });
  await act(async () => root.render(<SettingsScreen onOpen={() => {}} />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  await arrivalStorage.load();
  navigation.focused = true;
});

function row(title: string) {
  const rows = root.container.queryAll((node) => node.type === 'SettingsRow' && node.props.title === title);
  expect(rows).toHaveLength(1);
  return rows[0];
}

async function press(title: string) {
  await act(async () => row(title).props.onPress());
}

async function answer(confirmed: boolean) {
  const buttons = native.Alert.alert.mock.calls.at(-1)![2]!;
  await act(async () => buttons[confirmed ? 1 : 0].onPress?.());
}

test('backup preview shows simple totals and keeps data intact until confirmed', async () => {
  const firstRegion = getCountrySubdivisions('ca').find(({ code }) => code === 'CA-ON')!.id;
  const secondRegion = getCountrySubdivisions('ca').find(({ code }) => code === 'CA-QC')!.id;
  const backup = {
    ...defaultAppData(),
    places: { ca: 'lived', fr: 'visited', jp: 'wishlist', [firstRegion]: 'visited', [secondRegion]: 'wishlist', 'city:6167865': 'visited' } as const,
    lists: [{ id: 'trip', name: 'Trip', placeIds: ['ca', 'jp'] }],
    homeCountryId: 'ca',
  };
  backupFile.text.mockResolvedValue(encodeDocument(backup));
  const before = appData.getSnapshot().data;
  await press(t('settings.restoreBackup'));
  expect(native.Alert.alert.mock.calls.at(-1)!.slice(0, 2)).toEqual([
    t('settings.replaceTitle'),
    t('settings.replaceSummary', {
      countries: formatNumber(3), regions: formatNumber(2), cities: formatNumber(1), lists: formatNumber(1), home: 'Canada',
    }),
  ]);
  expect(appData.getSnapshot().data).toBe(before);
  await answer(false);
  expect(appData.getSnapshot().data).toBe(before);
  await press(t('settings.restoreBackup'));
  await answer(true);
  expect(await arrivalStorage.load()).toEqual({ ...backup, onboardingCompleted: true });
  expect([...arrivalDatabase.entries()]).toEqual([
    ['app-data', encodeDocument({ ...backup, onboardingCompleted: true })],
  ]);
  expect(toast.getSnapshot()?.message).toBe(t('settings.backupRestored'));
});

test.each(resets)('cancelling %s preserves data and releases the controls', async (_name, label) => {
  const before = appData.getSnapshot().data;
  const onPress = row(t(label)).props.onPress;
  await act(async () => { onPress(); onPress(); });
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
  expect(row(t(label)).props.busy).toBe(true);
  await answer(false);
  expect(appData.getSnapshot().data).toBe(before);
  expect(row(t(label)).props.disabled).toBe(false);
  expect(toast.getSnapshot()).toBeNull();
});

test.each(resets)('confirming %s applies only the selected reset', async (name, label) => {
  const before = appData.getSnapshot().data;
  toast.showToast({ message: 'Old feedback' });
  await press(t(label));
  await answer(true);
  const saved = await arrivalStorage.load();
  if (name === 'clear') {
    expect(saved).toEqual({ ...before, places: {}, lists: [], homeCountryId: null });
    expect(toast.getSnapshot()?.message).toBe(t('settings.travelCleared'));
  } else if (name === 'preferences') {
    expect(saved).toEqual({ ...before, preferences: defaultPreferences });
    expect(toast.getSnapshot()?.message).toBe(t('settings.preferencesReset'));
  } else {
    expect(saved).toEqual(defaultAppData());
    expect(toast.getSnapshot()?.visible).toBe(false);
  }
});

test.each(resets)('leaving Settings prevents a pending %s confirmation from changing data', async (_name, label) => {
  const before = appData.getSnapshot().data;
  await press(t(label));
  navigation.focused = false;
  await act(async () => root.render(<SettingsScreen onOpen={() => {}} />));
  await answer(true);
  expect(appData.getSnapshot().data).toBe(before);
  expect(toast.getSnapshot()).toBeNull();
});

test.each([
  ['settings.clearTravel', 'save'],
  ['settings.resetPreferences', 'save'],
  ['settings.resetApp', 'clear'],
] as const)('%s failures preserve data and allow a retry', async (label, method) => {
  const before = appData.getSnapshot().data;
  const fail = spyOn(arrivalStorage, method).mockRejectedValueOnce(new Error('Disk full'));
  try {
    await press(t(label));
    await answer(true);
    expect(appData.getSnapshot().data).toBe(before);
    expect(native.Alert.alert.mock.calls.at(-1)![0]).toBe(t('settings.couldNotFinish'));
    expect(row(t(label)).props.disabled).toBe(false);
    expect(toast.getSnapshot()).toBeNull();
    await press(t(label));
    await answer(true);
    if (label === 'settings.resetPreferences') {
      expect(appData.getSnapshot().data.preferences).toEqual(defaultPreferences);
      expect(appData.getSnapshot().data.places).toEqual(before.places);
    } else expect(appData.getSnapshot().data.places).toEqual({});
  } finally {
    fail.mockRestore();
  }
});
