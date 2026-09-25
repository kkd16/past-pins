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

export async function requestArrivalPermissions(isCurrent: () => boolean = () => true) {
  if (!isCurrent()) return;
  if (!(await arrivalMonitoringAvailable())) throw new UserFacingError(t('location.arrivalBuildRequired'));
  if (!isCurrent()) return;
  if (!(await Location.hasServicesEnabledAsync()))
    throw new UserFacingError(t('location.servicesDisabled'));
  if (!isCurrent()) return;
  const notifications = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (!isCurrent()) return;
  if (!notificationsAllowed(notifications))
    throw new UserFacingError(t('location.arrivalPermissions'));
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!isCurrent()) return;
  if (!foreground.granted) throw new UserFacingError(t('location.arrivalPermissions'));
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!isCurrent()) return;
  if (!background.granted) throw new UserFacingError(t('location.arrivalPermissions'));
}
