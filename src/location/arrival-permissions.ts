import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { UserFacingError } from '../data/errors';
import { t } from '../localization';

export function notificationsAllowed(permission: Notifications.NotificationPermissionsStatus) {
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function arrivalMonitoringAvailable() {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    await TaskManager.isAvailableAsync();
}

export async function arrivalPermissionsGranted() {
  return await Location.hasServicesEnabledAsync() &&
    (await Location.getBackgroundPermissionsAsync()).granted &&
    notificationsAllowed(await Notifications.getPermissionsAsync());
}

export type ArrivalPermission = 'location' | 'background' | 'notifications';

export async function requestArrivalPermission(
  permission: ArrivalPermission,
  isCurrent: () => boolean = () => true,
) {
  if (!isCurrent()) return;
  if (!(await Location.hasServicesEnabledAsync()))
    throw new UserFacingError(t('location.servicesDisabled'));
  if (!isCurrent()) return;

  if (permission !== 'location') {
    if (!(await arrivalMonitoringAvailable()))
      throw new UserFacingError(t('location.arrivalBuildRequired'));
    if (!isCurrent()) return;
    const prerequisite = permission === 'background'
      ? await Location.getForegroundPermissionsAsync()
      : await Location.getBackgroundPermissionsAsync();
    if (!isCurrent()) return;
    if (!prerequisite.granted) throw new UserFacingError(t('location.arrivalPermissions'));
  }

  let granted: boolean;
  if (permission === 'notifications') {
    granted = notificationsAllowed(await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }));
  } else if (permission === 'location') {
    granted = (await Location.requestForegroundPermissionsAsync()).granted;
  } else {
    granted = (await Location.requestBackgroundPermissionsAsync()).granted;
  }
  if (isCurrent() && !granted) throw new UserFacingError(t('location.arrivalPermissions'));
}

export async function requestArrivalPermissions(isCurrent: () => boolean = () => true) {
  if (!isCurrent()) return;
  if (!(await arrivalMonitoringAvailable())) throw new UserFacingError(t('location.arrivalBuildRequired'));
  for (const permission of ['location', 'background', 'notifications'] as const)
    await requestArrivalPermission(permission, isCurrent);
}
