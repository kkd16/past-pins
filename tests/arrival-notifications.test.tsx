import type { DataSnapshot } from '../src/data/store';
import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { act, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'test-renderer';
import type { NotificationPermissionsStatus, NotificationResponse } from 'expo-notifications';

import { t } from '../src/localization';
import { native, navigation } from './setup';
import { arrivalDatabase, arrivalStorage, constants, diagnosticLog, location, notifications, notificationState, tasks } from './native-location';

const { appData } = await import('../src/data/app-data');
const showToast = mock();
mock.module('../src/feedback/ToastProvider', () => ({ useToast: () => ({ showToast }) }));
const { requestArrivalPermissions } = await import('../src/location/arrival-permissions');
const { arrivalTracker, syncArrivalMonitoring, checkCurrentArrival } =
  await import('../src/location/arrival-notifications');
const backgroundTask = tasks.defineTask.mock.calls[0][1];
mock.module('../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => select(appData.getSnapshot()),
}));
mock.module('../src/components/ToggleRow', () => ({ ToggleRow: 'ToggleRow' }));
mock.module('../src/settings/SettingsSection', () => ({ SettingsSection: 'SettingsSection' }));
const { CountryArrivalNotifications } = await import('../src/location/CountryArrivalNotifications');
const { useArrivalConfirmation } = await import('../src/location/useArrivalConfirmation');
const { ArrivalAlertsSetting } = await import('../src/location/ArrivalAlertsSetting');

let root: Root;
let token: number;
const granted = { granted: true } as NotificationPermissionsStatus;
const denied = { granted: false } as NotificationPermissionsStatus;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(async () => {
  await appData.load();
  await appData.resetApp();
  await appData.completeOnboarding(false);
  showToast.mockClear();
  constants.executionEnvironment = 'bare';
  notificationState.response = null;
  native.AppState.currentState = 'active';
  native.Alert.alert.mockReset();
  native.AppState.addEventListener.mockClear();
  navigation.focused = true;
  navigation.router.push.mockClear();
  location.hasServicesEnabledAsync.mockReset().mockResolvedValue(true);
  location.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.requestBackgroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.getForegroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.getBackgroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.hasStartedLocationUpdatesAsync.mockReset().mockResolvedValue(false);
  location.startLocationUpdatesAsync.mockReset().mockResolvedValue();
  location.stopLocationUpdatesAsync.mockReset().mockResolvedValue();
  location.getCurrentPositionAsync.mockReset().mockImplementation(async () => ({
    timestamp: Date.now(), coords: { longitude: -75.69, latitude: 45.42 },
  }));
  tasks.isAvailableAsync.mockReset().mockResolvedValue(true);
  notifications.getPermissionsAsync.mockReset().mockResolvedValue(granted);
  notifications.requestPermissionsAsync.mockReset().mockResolvedValue(granted);
  notifications.scheduleNotificationAsync.mockReset().mockResolvedValue('notification');
  notifications.cancelAllScheduledNotificationsAsync.mockClear();
  notifications.dismissAllNotificationsAsync.mockClear();
  notifications.cancelScheduledNotificationAsync.mockClear();
  notifications.dismissNotificationAsync.mockClear();
  notifications.clearLastNotificationResponse.mockClear();
  root = createRoot({ isStrictMode: true });
});
afterEach(async () => {
  await act(async () => root.unmount());
  await arrivalStorage.load();
  navigation.focused = true;
});

async function makeArrival() {
  appData.updatePreferences({ countryArrivalAlerts: true });
  await checkCurrentArrival();
  const request = notifications.scheduleNotificationAsync.mock.calls.at(-1)![0] as {
    content: { data: { notifiedAt: number } };
  };
  token = request.content.data.notifiedAt;
  notificationState.response = {
    actionIdentifier: 'default',
    notification: { date: Date.now(), request: {
      ...request, identifier: 'notification', trigger: null,
      content: { ...request.content, title: null, subtitle: null, body: null,
        categoryIdentifier: null, sound: 'default', launchImageName: null,
        badge: null, attachments: [], threadIdentifier: null },
    } },
  } satisfies NotificationResponse;
  return request;
}

function Confirmation({ countryId = 'ca' }: { countryId?: string }) {
  useArrivalConfirmation(countryId, String(token));
  return null;
}

function ArrivalRuntime() {
  useSyncExternalStore(appData.subscribe, appData.getSnapshot);
  return <><ArrivalAlertsSetting disabled={false} /><CountryArrivalNotifications /></>;
}

test('Settings opt-in requests location before notifications and never starts monitoring itself', async () => {
  const order: string[] = [];
  location.requestForegroundPermissionsAsync.mockImplementation(async () => { order.push('foreground'); return granted; });
  location.requestBackgroundPermissionsAsync.mockImplementation(async () => { order.push('background'); return granted; });
  notifications.requestPermissionsAsync.mockImplementation(async () => { order.push('notifications'); return granted; });
  await syncArrivalMonitoring();
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  await requestArrivalPermissions();
  expect(order).toEqual(['foreground', 'background', 'notifications']);
  expect(notifications.requestPermissionsAsync).toHaveBeenCalledWith({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test.each(['notifications', 'foreground', 'background', 'services', 'expo-go'])(
  'does not enable arrival monitoring when %s is unavailable', async (reason) => {
    if (reason === 'notifications') notifications.requestPermissionsAsync.mockResolvedValue(denied);
    if (reason === 'foreground') location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    if (reason === 'background') location.requestBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    if (reason === 'services') location.hasServicesEnabledAsync.mockResolvedValue(false);
    if (reason === 'expo-go') constants.executionEnvironment = 'storeClient';
    await expect(requestArrivalPermissions()).rejects.toThrow();
    expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
    if (reason === 'services' || reason === 'expo-go')
      expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    if (reason !== 'notifications') expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  },
);

test('uses Expo background updates and stops after permission revocation without prompting', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  expect(await syncArrivalMonitoring()).toBe(true);
  expect(location.startLocationUpdatesAsync).toHaveBeenCalledWith('past-pins-country-arrivals', {
    accuracy: 3, distanceInterval: 1000, pausesUpdatesAutomatically: true,
  });
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  location.getBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
  expect(await syncArrivalMonitoring()).toBe(false);
  expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

test('headless locations use the shared saved statuses and produce localized notifications offline', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  await appData.setStatus(['ca'], 'lived');
  await backgroundTask({ data: { locations: [{ timestamp: Date.now(), coords: { longitude: -75.69, latitude: 45.42 } }] } });
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  await backgroundTask({ data: { locations: [{ timestamp: Date.now() + 1, coords: { longitude: 2.35, latitude: 48.86 } }] } });
  expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(notifications.scheduleNotificationAsync.mock.calls[0][0]).toMatchObject({
    content: { title: t('location.arrivalTitle', { country: 'France' }),
      body: t('location.arrivalBody'), data: { type: 'country-arrival', countryId: 'fr' } },
    trigger: null,
  });
  expect(appData.getSnapshot().data.places.fr).toBeUndefined();
});

test.each(['background', 'notifications', 'services'] as const)(
  'a headless location error stops monitoring after %s access is revoked', async (permission) => {
    await makeArrival();
    native.AppState.currentState = 'background';
    location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    if (permission === 'background') location.getBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    if (permission === 'notifications') notifications.getPermissionsAsync.mockResolvedValue(denied);
    if (permission === 'services') location.hasServicesEnabledAsync.mockResolvedValue(false);
    location.getCurrentPositionAsync.mockClear();
    notifications.scheduleNotificationAsync.mockClear();

    await expect(backgroundTask({ error: { code: 1, message: 'Location denied' } })).resolves.toBeUndefined();

    expect(location.stopLocationUpdatesAsync).toHaveBeenCalledWith('past-pins-country-arrivals');
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.dismissAllNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(notificationState.response).toBeNull();
    expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  },
);

test('a temporary headless location error preserves monitoring and ignores any accompanying coordinates', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  native.AppState.currentState = 'background';
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  await expect(backgroundTask({
    error: { code: 0, message: 'Location unknown' },
    data: { locations: [
      { timestamp: Date.now(), coords: { longitude: -75.69, latitude: 45.42 } },
    ] },
  })).resolves.toBeUndefined();
  expect(location.getBackgroundPermissionsAsync).toHaveBeenCalled();
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
  expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(arrivalDatabase.has('country-arrivals')).toBe(false);
});

test('a headless location error contains a failed stop and retries on the next callback', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  native.AppState.currentState = 'background';
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  location.getBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
  location.stopLocationUpdatesAsync.mockRejectedValueOnce(new Error('Unregister failed'));
  const event = { error: { code: 1, message: 'Location denied' } };
  await expect(backgroundTask(event)).resolves.toBeUndefined();
  expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  await expect(backgroundTask(event)).resolves.toBeUndefined();
  expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(2);
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
});

test.each([
  ['ready', 'locations'], ['load-error', 'locations'],
  ['ready', 'error'], ['load-error', 'error'],
] as const)('a headless launch respects a %s load result for a callback containing %s', async (status, callback) => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  const current = appData.getSnapshot();
  const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue({ ...current, status: 'loading' });
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const load = spyOn(appData, 'load').mockImplementation(async () => {
    started.resolve();
    await gate.promise;
    snapshot.mockReturnValue({ ...current, status });
  });
  try {
    const task = backgroundTask(callback === 'error'
      ? { error: { code: 0, message: 'Location unknown' } }
      : { data: { locations: [
        { timestamp: Date.now(), coords: { longitude: -75.69, latitude: 45.42 } },
      ] } });
    await started.promise;
    expect(load).toHaveBeenCalledTimes(1);
    expect(notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    gate.resolve();
    await task;
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(
      status === 'ready' && callback === 'locations' ? 1 : 0,
    );
  } finally {
    gate.resolve();
    load.mockRestore();
    snapshot.mockRestore();
  }
});

test('disabling clears pending and delivered notifications and cached responses', async () => {
  await makeArrival();
  await appData.resetPreferences();
  await syncArrivalMonitoring();
  expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(notifications.dismissAllNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(notificationState.response).toBeNull();
  expect(arrivalDatabase.has('country-arrivals')).toBe(true);
});

test('startup handles a cached tap once and navigates without changing the country', async () => {
  await makeArrival();
  await act(async () => root.render(<CountryArrivalNotifications />));
  expect(navigation.router.push).toHaveBeenCalledWith({
    pathname: '/country/[id]', params: { id: 'ca', arrival: String(token) },
  });
  await act(async () => root.render(<CountryArrivalNotifications />));
  expect(navigation.router.push).toHaveBeenCalledTimes(1);
  expect(appData.getSnapshot().data.places.ca).toBeUndefined();
});

test('confirmation uses the existing save and Undo flow; cancel never edits', async () => {
  await makeArrival();
  await act(async () => root.render(<Confirmation />));
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
  expect(appData.getSnapshot().data.places.ca).toBeUndefined();
  const buttons = native.Alert.alert.mock.calls[0][2]!;
  expect(buttons[0]).toMatchObject({ text: t('location.notNow'), style: 'cancel' });
  await act(async () => buttons[1].onPress?.());
  expect(appData.getSnapshot().data.places.ca).toBe('visited');
  appData.undo(appData.getSnapshot().pendingUndo!.id);
  expect(appData.getSnapshot().data.places.ca).toBeUndefined();
  await act(async () => root.render(<Confirmation />));
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
});

test('a failed arrival confirmation records safe diagnostics without logging the raw error', async () => {
  await makeArrival();
  await diagnosticLog.clear();
  const read = spyOn(arrivalStorage, 'getItem').mockRejectedValue(new Error('private arrival details'));
  const warning = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await act(async () => root.render(<Confirmation />));
    expect(native.Alert.alert).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
    const text = await diagnosticLog.export();
    expect(JSON.parse(text).events).toContainEqual(
      expect.objectContaining({ operation: 'reminders', code: 'unexpected' }),
    );
    expect(text).not.toContain('private arrival details');
  } finally {
    read.mockRestore();
    warning.mockRestore();
  }
});

test.each(['blur', 'reset', 'restore', 'lived'])(
  'a confirmation cannot apply after %s', async (change) => {
    await makeArrival();
    await act(async () => root.render(<Confirmation />));
    const confirm = native.Alert.alert.mock.calls[0][2]![1].onPress!;
    if (change === 'blur') navigation.focused = false;
    if (change === 'reset') await appData.resetApp();
    if (change === 'restore') await appData.restore({ ...appData.getSnapshot().data, places: { jp: 'visited' } });
    if (change === 'lived') await appData.setStatus(['ca'], 'lived');
    await act(async () => root.render(<Confirmation />));
    await act(async () => confirm());
    expect(appData.getSnapshot().data.places.ca).toBe(change === 'lived' ? 'lived' : undefined);
  },
);

test('old notifications cannot prompt after a reset even if alerts are re-enabled', async () => {
  await makeArrival();
  await appData.resetApp();
  await appData.completeOnboarding(true);
  expect(await arrivalTracker.isCurrent({ countryId: 'ca', notifiedAt: token })).toBe(false);
  await act(async () => root.render(<Confirmation />));
  expect(native.Alert.alert).not.toHaveBeenCalled();
});

test('onboarding blocks background arrivals and notification navigation until saved', async () => {
  await makeArrival();
  const response = notificationState.response;
  await appData.resetApp();
  appData.updatePreferences({ countryArrivalAlerts: true });
  notificationState.response = response;
  notifications.scheduleNotificationAsync.mockClear();
  await backgroundTask({ data: { locations: [{ timestamp: Date.now() + 1, coords: { longitude: 2.35, latitude: 48.86 } }] } });
  await act(async () => root.render(<CountryArrivalNotifications />));
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(navigation.router.push).not.toHaveBeenCalled();
});

test('monitoring startup failure turns reminders off and shows a notice after onboarding', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  location.startLocationUpdatesAsync.mockRejectedValue(new Error('Start failed'));
  const warning = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await act(async () => root.render(<CountryArrivalNotifications />));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(true);
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({ message: t('location.arrivalStartFailed') });
  } finally {
    warning.mockRestore();
  }
});

test('a temporary location failure keeps arrival monitoring enabled', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  location.getCurrentPositionAsync.mockRejectedValue(new Error('No location fix'));
  const warning = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await act(async () => root.render(<CountryArrivalNotifications />));
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  } finally {
    warning.mockRestore();
  }
});

test('a full reset stops monitoring while returning to onboarding', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  await act(async () => root.render(<CountryArrivalNotifications />));
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  await appData.resetApp();
  await act(async () => root.render(<CountryArrivalNotifications />));
  expect(location.stopLocationUpdatesAsync).toHaveBeenCalled();
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
});

test.each(['disable', 'reset'])(
  '%s stops background tracking even when permission checks fail', async (action) => {
    appData.updatePreferences({ countryArrivalAlerts: true });
    location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    if (action === 'disable') appData.updatePreferences({ countryArrivalAlerts: false });
    else await appData.resetApp();
    location.hasServicesEnabledAsync.mockRejectedValue(new Error('Location service unavailable'));
    await expect(syncArrivalMonitoring()).resolves.toBe(false);
    expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(location.hasServicesEnabledAsync).not.toHaveBeenCalled();
    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  },
);

test('a permission check begun before reset cannot undo a newly saved opt-in', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  const checking = Promise.withResolvers<void>();
  const permission = Promise.withResolvers<NotificationPermissionsStatus>();
  notifications.getPermissionsAsync.mockImplementationOnce(async () => {
    checking.resolve();
    return permission.promise;
  });
  const syncing = syncArrivalMonitoring();
  await checking.promise;
  await appData.resetApp();
  await appData.completeOnboarding(true);
  permission.resolve(denied);
  expect(await syncing).toBe(false);
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
  expect(await syncArrivalMonitoring()).toBe(true);
  expect(location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
});

test('a delayed monitoring failure does not disable restored reminder preferences', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  const starting = Promise.withResolvers<void>();
  const startup = Promise.withResolvers<void>();
  location.startLocationUpdatesAsync.mockImplementationOnce(async () => {
    starting.resolve();
    return startup.promise;
  });
  const warning = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await act(async () => root.render(<CountryArrivalNotifications />));
    await starting.promise;
    await appData.restore({ ...appData.getSnapshot().data, places: { jp: 'visited' } });
    await act(async () => root.render(<CountryArrivalNotifications />));
    await act(async () => startup.reject(new Error('Start failed')));
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  } finally {
    warning.mockRestore();
  }
});

test('invalid payloads and unknown countries cannot navigate', async () => {
  await makeArrival();
  notificationState.response!.notification.request.content.data = { type: 'country-arrival', countryId: 'zz', notifiedAt: token };
  await act(async () => root.render(<CountryArrivalNotifications />));
  expect(navigation.router.push).not.toHaveBeenCalled();
});

test('an already visited notification opens details without a confirmation or downgrade', async () => {
  await makeArrival();
  await appData.setStatus(['ca'], 'lived');
  await act(async () => root.render(<Confirmation />));
  expect(native.Alert.alert).not.toHaveBeenCalled();
  expect(appData.getSnapshot().data.places.ca).toBe('lived');
});

test('Settings exposes native permission failures without enabling alerts', async () => {
  notifications.requestPermissionsAsync.mockResolvedValue(denied);
  await act(async () => root.render(<ArrivalAlertsSetting disabled={false} />));
  const toggle = root.container.queryAll((node) => node.type === 'ToggleRow')[0];
  await act(async () => toggle.props.onValueChange(true));
  expect(native.Alert.alert).toHaveBeenCalledWith(
    t('location.arrivalUnavailable'), t('location.arrivalPermissions'), expect.any(Array),
  );
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
});

test('turning off during native startup stops the just-started task', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  const start = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  location.startLocationUpdatesAsync.mockImplementationOnce(async () => { started.resolve(); await start.promise; });
  const syncing = syncArrivalMonitoring();
  await started.promise;
  await appData.resetPreferences();
  start.resolve();
  expect(await syncing).toBe(false);
  expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
});

test('a status edit during the final permission check prevents notification scheduling', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  const permission = Promise.withResolvers<NotificationPermissionsStatus>();
  const checking = Promise.withResolvers<void>();
  notifications.getPermissionsAsync.mockImplementationOnce(async () => {
    checking.resolve();
    return permission.promise;
  });
  const arrival = checkCurrentArrival();
  await checking.promise;
  await appData.setStatus(['ca'], 'visited');
  permission.resolve(granted);
  await arrival;
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('Settings saves the opt-in and leaves monitoring startup to the root observer', async () => {
  await act(async () => root.render(<ArrivalAlertsSetting disabled={false} />));
  const toggle = root.container.queryAll((node) => node.type === 'ToggleRow')[0];
  await act(async () => toggle.props.onValueChange(true));
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
  expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test('the root observer handles a Settings startup failure once', async () => {
  location.startLocationUpdatesAsync.mockRejectedValue(new Error('Start failed'));
  const warning = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await act(async () => root.render(<ArrivalRuntime />));
    const toggle = root.container.queryAll((node) => node.type === 'ToggleRow')[0];
    await act(async () => toggle.props.onValueChange(true));
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
    expect(location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(native.Alert.alert).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({ message: t('location.arrivalStartFailed') });
  } finally {
    warning.mockRestore();
  }
});

test('Settings opt-out stops monitoring through the root observer without requesting access', async () => {
  appData.updatePreferences({ countryArrivalAlerts: true });
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  await act(async () => root.render(<ArrivalRuntime />));
  const toggle = root.container.queryAll((node) => node.type === 'ToggleRow')[0];
  await act(async () => toggle.props.onValueChange(false));
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
  expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test('a delayed Settings permission failure cannot overwrite restored preferences', async () => {
  const permission = Promise.withResolvers<NotificationPermissionsStatus>();
  notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
  await act(async () => root.render(<ArrivalAlertsSetting disabled={false} />));
  const toggle = root.container.queryAll((node) => node.type === 'ToggleRow')[0];
  await act(async () => toggle.props.onValueChange(true));
  const data = appData.getSnapshot().data;
  await appData.restore({ ...data, preferences: { ...data.preferences, countryArrivalAlerts: true } });
  await act(async () => root.render(<ArrivalAlertsSetting disabled={false} />));
  await act(async () => permission.reject(new Error('Permission failed')));
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
  expect(native.Alert.alert).not.toHaveBeenCalled();
});

test('a failed data load waits for Retry and preserves a pending notification tap', async () => {
  await makeArrival();
  const response = notificationState.response;
  const failed = { ...appData.getSnapshot(), status: 'load-error' as const };
  const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue(failed);
  const load = spyOn(appData, 'load');
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  try {
    expect(await syncArrivalMonitoring()).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(notificationState.response).toBe(response);
    await backgroundTask({ data: { locations: [] } });
    expect(load).not.toHaveBeenCalled();
    expect(notificationState.response).toBe(response);
  } finally {
    snapshot.mockRestore();
    load.mockRestore();
  }
});

test('a failed save keeps a notification tap available until Retry save succeeds', async () => {
  await makeArrival();
  const response = notificationState.response;
  const failed = { ...appData.getSnapshot(), saveError: true };
  const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue(failed);
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  try {
    await act(async () => root.render(<CountryArrivalNotifications />));
    expect(navigation.router.push).not.toHaveBeenCalled();
    expect(location.stopLocationUpdatesAsync).toHaveBeenCalled();
    expect(notificationState.response).toBe(response);
    snapshot.mockRestore();
    await act(async () => root.render(<CountryArrivalNotifications />));
    expect(navigation.router.push).toHaveBeenCalledTimes(1);
    expect(navigation.router.push).toHaveBeenCalledWith({
      pathname: '/country/[id]', params: { id: 'ca', arrival: String(token) },
    });
  } finally {
    snapshot.mockRestore();
  }
});

test('arrival confirmation resumes when Retry save makes the data ready', async () => {
  await makeArrival();
  const failed = { ...appData.getSnapshot(), saveError: true };
  const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue(failed);
  try {
    await act(async () => root.render(<Confirmation />));
    expect(native.Alert.alert).not.toHaveBeenCalled();
    snapshot.mockRestore();
    await act(async () => root.render(<Confirmation />));
    expect(native.Alert.alert).toHaveBeenCalledTimes(1);
  } finally {
    snapshot.mockRestore();
  }
});

test('an explicit opt-out clears notifications even if saving that choice fails', async () => {
  await makeArrival();
  location.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
  const save = spyOn(arrivalStorage, 'save').mockRejectedValueOnce(new Error('Disk full'));
  try {
    appData.updatePreferences({ countryArrivalAlerts: false });
    await arrivalStorage.load();
    expect(appData.getSnapshot().saveError).toBe(true);
    expect(await syncArrivalMonitoring()).toBe(false);
    expect(location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.dismissAllNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(notificationState.response).toBeNull();
  } finally {
    save.mockRestore();
  }
});

test('resuming retries a failed notification read once without duplicating navigation', async () => {
  await makeArrival();
  const response = notificationState.response;
  const read = spyOn(arrivalStorage, 'getItem').mockRejectedValue(new Error('Read failed'));
  const warning = spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await act(async () => root.render(<CountryArrivalNotifications />));
    expect(navigation.router.push).not.toHaveBeenCalled();
    expect(notificationState.response).toBe(response);
    read.mockRestore();
    await act(async () => {
      for (const [, listener] of native.AppState.addEventListener.mock.calls) {
        listener('active');
        listener('active');
      }
    });
    expect(navigation.router.push).toHaveBeenCalledTimes(1);
    expect(notificationState.response).toBeNull();
  } finally {
    read.mockRestore();
    warning.mockRestore();
  }
});

test.each(['saveError', 'busy'] as const)(
  '%s beginning during a notification read preserves its tap until recovery', async (state) => {
    await makeArrival();
    const response = notificationState.response;
    const pending = Promise.withResolvers<void>();
    const getItem = arrivalStorage.getItem;
    const read = spyOn(arrivalStorage, 'getItem').mockImplementation(async (key) => {
      await pending.promise;
      return getItem(key);
    });
    await act(async () => root.render(<CountryArrivalNotifications />));
    const interrupted = { ...appData.getSnapshot(), [state]: true };
    const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue(interrupted);
    try {
      await act(async () => pending.resolve());
      expect(navigation.router.push).not.toHaveBeenCalled();
      expect(notificationState.response).toBe(response);
      snapshot.mockRestore();
      read.mockRestore();
      await act(async () => {
        for (const [, listener] of native.AppState.addEventListener.mock.calls) listener('active');
      });
      expect(navigation.router.push).toHaveBeenCalledTimes(1);
      expect(notificationState.response).toBeNull();
    } finally {
      pending.resolve();
      snapshot.mockRestore();
      read.mockRestore();
    }
  },
);
