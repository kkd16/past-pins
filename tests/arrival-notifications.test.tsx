import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'test-renderer';
import type { NotificationPermissionsStatus, NotificationResponse } from 'expo-notifications';

import { t } from '../src/localization';
import { native, navigation } from './setup';
import { arrivalDatabase, arrivalStorage, constants, location, notifications, notificationState, tasks } from './native-location';

const { appData } = await import('../src/data/app-data');
const { arrivalTracker, requestArrivalPermissions, syncArrivalMonitoring, checkCurrentArrival } =
  await import('../src/location/arrival-notifications');
const backgroundTask = tasks.defineTask.mock.calls[0][1];
mock.module('../src/data/AppDataProvider', () => ({
  useAppData: () => ({ ...appData, ...appData.getSnapshot() }),
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

test('permissions are requested only by opting in, in notification/foreground/background order', async () => {
  await syncArrivalMonitoring();
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  await requestArrivalPermissions();
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
    if (reason === 'notifications' || reason === 'services' || reason === 'expo-go')
      expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
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
      body: t('location.arrivalBody', { country: 'France' }), data: { type: 'country-arrival', countryId: 'fr' } },
    trigger: null,
  });
  expect(appData.getSnapshot().data.places.fr).toBeUndefined();
});

test('disabling clears pending and delivered notifications and cached responses', async () => {
  await makeArrival();
  appData.resetPreferences();
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
  appData.updatePreferences({ countryArrivalAlerts: true });
  expect(await arrivalTracker.isCurrent({ countryId: 'ca', notifiedAt: token })).toBe(false);
  await act(async () => root.render(<Confirmation />));
  expect(native.Alert.alert).not.toHaveBeenCalled();
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
  appData.resetPreferences();
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

test('Settings keeps alerts off and reports a native startup failure', async () => {
  location.startLocationUpdatesAsync.mockRejectedValueOnce(new Error('Start failed'));
  await act(async () => root.render(<ArrivalAlertsSetting disabled={false} />));
  const toggle = root.container.queryAll((node) => node.type === 'ToggleRow')[0];
  await act(async () => toggle.props.onValueChange(true));
  expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
  expect(native.Alert.alert).toHaveBeenCalledWith(
    t('location.arrivalUnavailable'), t('common.unknownError'), expect.any(Array),
  );
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
