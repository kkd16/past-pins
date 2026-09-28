import { createDiagnosticLog } from '../src/recovery/diagnostics';
import { mock } from 'bun:test';
import type { NotificationPermissionsStatus, NotificationResponse } from 'expo-notifications';
import type { ArrivalLocation } from '../src/location/arrivals';
import { createDocumentStorage } from '../src/storage/document-storage';

export const location = {
  hasServicesEnabledAsync: mock(async () => true),
  requestForegroundPermissionsAsync: mock(async () => ({ granted: true })),
  requestBackgroundPermissionsAsync: mock(async () => ({ granted: true })),
  getForegroundPermissionsAsync: mock(async () => ({ granted: true })),
  getBackgroundPermissionsAsync: mock(async () => ({ granted: true })),
  getCurrentPositionAsync: mock(async () => ({
    timestamp: Date.now(), coords: { longitude: -75.69, latitude: 45.42 },
  })),
  reverseGeocodeAsync: mock(async (): Promise<{ isoCountryCode: string | null }[]> => [{ isoCountryCode: 'CA' }]),
  hasStartedLocationUpdatesAsync: mock(async () => false),
  startLocationUpdatesAsync: mock(async () => {}),
  stopLocationUpdatesAsync: mock(async () => {}),
  Accuracy: { Balanced: 3 },
};
mock.module('expo-location', () => location);

export const notificationState = { response: null as NotificationResponse | null };
const permission = { granted: true } as NotificationPermissionsStatus;
export const notifications = {
  getPermissionsAsync: mock(async () => permission),
  requestPermissionsAsync: mock(async () => permission),
  scheduleNotificationAsync: mock(async (_request: unknown) => 'notification'),
  cancelScheduledNotificationAsync: mock(async (_id: string) => {}),
  dismissNotificationAsync: mock(async (_id: string) => {}),
  cancelAllScheduledNotificationsAsync: mock(async () => {}),
  dismissAllNotificationsAsync: mock(async () => {}),
  clearLastNotificationResponse: mock(() => { notificationState.response = null; }),
  useLastNotificationResponse: () => notificationState.response,
  setNotificationHandler: mock(),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  DEFAULT_ACTION_IDENTIFIER: 'default',
};
mock.module('expo-notifications', () => notifications);

export const tasks = {
  isAvailableAsync: mock(async () => true),
  defineTask: mock((_name: string, _task: (event: { data?: { locations: ArrivalLocation[] }; error?: unknown }) => Promise<void>) => {}),
};
mock.module('expo-task-manager', () => tasks);
export const constants = { executionEnvironment: 'bare' };
mock.module('expo-constants', () => ({ default: constants, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
export const haptics = { selectionAsync: mock(async () => {}) };
mock.module('expo-haptics', () => haptics);

export const arrivalDatabase = new Map<string, string>();
export const arrivalStorage = createDocumentStorage({
  async getItem(key) { return arrivalDatabase.get(key) ?? null; },
  async setItem(key, value) { arrivalDatabase.set(key, value); },
  async clear() { arrivalDatabase.clear(); },
});
mock.module('../src/storage/app-storage', () => ({ appStorage: arrivalStorage }));

export const diagnosticLog = createDiagnosticLog({
  async read() { return null; }, async write() {}, async clear() {},
});
mock.module('../src/recovery/diagnostics-file', () => ({ diagnostics: diagnosticLog }));
