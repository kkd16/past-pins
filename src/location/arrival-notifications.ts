import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { countryById } from '../countries/catalog';
import { appData } from '../data/app-data';
import { UserFacingError } from '../data/errors';
import { isVisited } from '../data/model';
import { t } from '../localization';
import { appStorage } from '../storage/app-storage';
import {
  ARRIVAL_TYPE, arrivalsEnabled, createArrivalTracker, parseArrival,
} from './arrivals';
import { arrivalMonitoringAvailable, arrivalPermissionsGranted, notificationsAllowed } from './arrival-permissions';

const TASK_NAME = 'past-pins-country-arrivals';

export const arrivalTracker = createArrivalTracker(appStorage, appData.getSnapshot, {
  async send(arrival) {
    const permission = await Notifications.getPermissionsAsync();
    if (!notificationsAllowed(permission))
      throw new UserFacingError(t('location.arrivalPermissions'));
    const snapshot = appData.getSnapshot();
    if (!arrivalsEnabled(snapshot) || isVisited(snapshot.data.places[arrival.countryId])) return null;
    const country = countryById.get(arrival.countryId)!.name;
    return Notifications.scheduleNotificationAsync({
      content: {
        title: t('location.arrivalTitle', { country }),
        body: t('location.arrivalBody', { country }),
        data: { type: ARRIVAL_TYPE, ...arrival },
        sound: 'default',
      },
      trigger: null,
    });
  },
  async remove(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.dismissNotificationAsync(id);
  },
});

// Headless tasks are registered before Router mounts any screens.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  try {
    if (appData.getSnapshot().status === 'loading') await appData.load();
    if (arrivalsEnabled(appData.getSnapshot()) && await arrivalPermissionsGranted())
      await arrivalTracker.process(data.locations);
    else await syncArrivalMonitoring();
  } catch (error) {
    console.warn('Country arrival check failed:', error);
  }
});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = !!parseArrival(notification.request.content.data) && arrivalsEnabled(appData.getSnapshot());
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
    };
  },
});

async function clearArrivalNotifications() {
  // Arrival alerts are the app's only notifications.
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
  Notifications.clearLastNotificationResponse();
}

let monitoring = Promise.resolve(false);
export function syncArrivalMonitoring(): Promise<boolean> {
  const result = monitoring.catch(() => false).then(async () => {
    const snapshot = appData.getSnapshot();
    if (snapshot.status === 'loading' || snapshot.busy) return false;
    if (!(await arrivalMonitoringAvailable())) return false;
    // Opting out must stop an existing task even if permission reads fail.
    const shouldMonitor = arrivalsEnabled(snapshot);
    const permitted = shouldMonitor && await arrivalPermissionsGranted();
    let started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    const enabled = arrivalsEnabled(appData.getSnapshot()) && permitted;
    if (enabled) {
      if (!started) {
        await Location.startLocationUpdatesAsync(TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 1000,
          pausesUpdatesAutomatically: true,
        });
        started = true;
      }
      if (arrivalsEnabled(appData.getSnapshot())) return true;
    }
    if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);
    // Preserve taps through data recovery unless the user has explicitly opted out.
    const current = appData.getSnapshot();
    if (current.status === 'ready' && !current.busy &&
      (!current.saveError || !current.data.preferences.countryArrivalAlerts)) {
      await clearArrivalNotifications();
      // An older permission check must not undo a newly saved opt-in or restore.
      if (shouldMonitor && !permitted &&
        appData.getSnapshot().data.preferences === snapshot.data.preferences)
        appData.updatePreferences({ countryArrivalAlerts: false });
    }
    return false;
  });
  monitoring = result;
  return result;
}

export async function checkCurrentArrival() {
  const snapshot = appData.getSnapshot();
  if (!arrivalsEnabled(snapshot) || AppState.currentState !== 'active') return;
  // Permissions were checked by syncArrivalMonitoring; never prompt on launch.
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  if (appData.getSnapshot().data === snapshot.data && AppState.currentState === 'active')
    await arrivalTracker.process([location]);
}
