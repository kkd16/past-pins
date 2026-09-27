import type { DataSnapshot } from '../src/data/store';
import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import { act, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { countryById } from '../src/countries/catalog';
import { defaultAppData } from '../src/data/model';
import { formatNumber, t } from '../src/localization';
import { native, navigation } from './setup';
import { arrivalStorage, constants, haptics, location, notifications, tasks } from './native-location';
import './native-sharing';

const { appData } = await import('../src/data/app-data');
const motion = { reduced: false };
mock.module('../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => useSyncExternalStore(appData.subscribe, () => select(appData.getSnapshot())),
}));
mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/AppPressable', () => ({ AppPressable: 'AppPressable' }));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../src/components/Checkmark', () => ({ Checkmark: 'Checkmark' }));
mock.module('../src/components/Icon', () => ({ Icon: 'Icon' }));
mock.module('../src/components/Screen', () => ({ Screen: 'Screen' }));
mock.module('../src/components/DataFeedback', () => ({ DataFeedback: 'DataFeedback' }));
mock.module('../src/stamps/CountryStamp', () => ({ CountryStamp: 'CountryStamp' }));
mock.module('../src/motion/ReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { default: LocationPermissionRoute } = await import('../src/app/onboarding/location');
const { default: BackgroundPermissionRoute } = await import('../src/app/onboarding/background');
const { default: NotificationPermissionRoute } = await import('../src/app/onboarding/notifications');
const { AppNavigator } = await import('../src/navigation/AppNavigator');
const { default: WelcomeRoute } = await import('../src/app/onboarding');
const { default: OnboardingLayout } = await import('../src/app/onboarding/_layout');
const permissionSteps = [
  { name: 'location', Screen: LocationPermissionRoute, action: 'onboarding.allowLocation',
    request: location.requestForegroundPermissionsAsync, next: '/onboarding/background' } as const,
  { name: 'background', Screen: BackgroundPermissionRoute, action: 'onboarding.allowBackground',
    request: location.requestBackgroundPermissionsAsync, next: '/onboarding/notifications' } as const,
  { name: 'notifications', Screen: NotificationPermissionRoute, action: 'onboarding.allowNotifications',
    request: notifications.requestPermissionsAsync, next: null } as const,
];
let root: Root;
const granted = { granted: true } as NotificationPermissionsStatus;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(async () => {
  await appData.load();
  await appData.resetApp();
  navigation.focused = true;
  navigation.router.navigate.mockClear();
  constants.executionEnvironment = 'bare';
  motion.reduced = false;
  location.hasServicesEnabledAsync.mockReset().mockResolvedValue(true);
  location.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.requestBackgroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.getForegroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.getBackgroundPermissionsAsync.mockReset().mockResolvedValue({ granted: true });
  location.startLocationUpdatesAsync.mockClear();
  notifications.requestPermissionsAsync.mockReset().mockResolvedValue(granted);
  notifications.getPermissionsAsync.mockReset().mockResolvedValue(granted);
  tasks.isAvailableAsync.mockReset().mockResolvedValue(true);
  haptics.selectionAsync.mockReset().mockResolvedValue(undefined);
  native.useWindowDimensions.mockReset().mockReturnValue({ width: 375, height: 812, scale: 3, fontScale: 1 });
  native.AccessibilityInfo.announceForAccessibilityWithOptions.mockClear();
  root = createRoot({ isStrictMode: true });
});

afterEach(async () => {
  await act(async () => root.unmount());
  await arrivalStorage.load();
  navigation.focused = true;
});

function button(label: string) {
  const buttons = root.container.queryAll((node) => node.type === 'Button' && node.props.label === label);
  expect(buttons).toHaveLength(1);
  return buttons[0];
}

async function press(label: string) {
  await act(async () => button(label).props.onPress());
}

function routes() {
  return root.container.queryAll((node) => node.type === 'Stack.Screen').map((node) => node.props.name);
}

function stamp(id: string) {
  const label = t('onboarding.sampleStamp', { country: countryById.get(id)!.name });
  const stamps = root.container.queryAll((node) => node.type === 'AppPressable' && node.props.accessibilityLabel === label);
  expect(stamps).toHaveLength(1);
  return stamps[0];
}

function expectStampCount(count: number) {
  const message = count === 0 ? t('onboarding.tapToStamp') : t('onboarding.stampsCollected', {
    count, amount: formatNumber(count),
  });
  expect(root.container.queryAll((node) => node.type === 'Text' && node.props.children === message)).toHaveLength(1);
}

test('Welcome can continue without trying a stamp or requesting access', async () => {
  await act(async () => root.render(<WelcomeRoute />));
  await press(t('onboarding.continue'));
  expect(navigation.router.navigate).toHaveBeenCalledWith('/onboarding/location');
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

test.each([1, 2])('sample stamps at font scale %s never enter saved travel data, even after setup', async (fontScale) => {
  native.useWindowDimensions.mockReturnValue({ width: 320, height: 568, scale: 2, fontScale });
  await appData.setStatus(['jp'], 'wishlist');
  const saved = await arrivalStorage.load();
  await act(async () => root.render(<WelcomeRoute />));
  expectStampCount(0);
  for (const [index, id] of ['ca', 'fr', 'jp'].entries()) {
    expect(stamp(id).props.accessibilityRole).toBe('checkbox');
    expect(stamp(id).props.accessibilityState.checked).toBe(false);
    await act(async () => stamp(id).props.onPress());
    expect(stamp(id).props.accessibilityState.checked).toBe(true);
    expectStampCount(index + 1);
  }
  expect(root.container.queryAll((node) => node.type === 'CountryStamp' && node.props.collected)).toHaveLength(3);
  await act(async () => stamp('fr').props.onPress());
  expect(stamp('fr').props.accessibilityState.checked).toBe(false);
  expect(stamp('ca').props.accessibilityState.checked).toBe(true);
  expectStampCount(2);
  await press(t('onboarding.continue'));
  expect(navigation.router.navigate).toHaveBeenCalledWith('/onboarding/location');
  expect(await arrivalStorage.load()).toEqual(saved);
  await act(async () => root.render(<NotificationPermissionRoute />));
  await press(t('location.notNow'));
  expect(await arrivalStorage.load()).toEqual({ ...saved, onboardingCompleted: true });
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

test('quick repeat taps can undo a sample stamp without losing other selections', async () => {
  await act(async () => root.render(<WelcomeRoute />));
  const toggle = stamp('ca').props.onPress;
  await act(async () => { toggle(); stamp('jp').props.onPress(); toggle(); });
  expect(stamp('ca').props.accessibilityState.checked).toBe(false);
  expect(stamp('jp').props.accessibilityState.checked).toBe(true);
  expectStampCount(1);
});

test('stamp feedback honors the haptics preference and tolerates native feedback errors', async () => {
  await appData.updatePreferences({ haptics: false });
  await act(async () => root.render(<WelcomeRoute />));
  await act(async () => stamp('ca').props.onPress());
  expect(haptics.selectionAsync).not.toHaveBeenCalled();
  await act(async () => appData.updatePreferences({ haptics: true }));
  haptics.selectionAsync.mockRejectedValueOnce(new Error('Haptics unavailable'));
  await act(async () => stamp('jp').props.onPress());
  expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
  expect(stamp('jp').props.accessibilityState.checked).toBe(true);
  expectStampCount(2);
  await press(t('onboarding.continue'));
  expect(navigation.router.navigate).toHaveBeenCalledWith('/onboarding/location');
});

test.each(permissionSteps)('Not now on $name finishes without requesting any permissions', async ({ Screen }) => {
  await act(async () => root.render(<Screen />));
  await press(t('location.notNow'));
  expect(await arrivalStorage.load()).toMatchObject({
    onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
  });
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

test('each slide requests only its own permission and only the last slide finishes setup', async () => {
  const order: string[] = [];
  notifications.requestPermissionsAsync.mockImplementation(async () => { order.push('notifications'); return granted; });
  location.requestForegroundPermissionsAsync.mockImplementation(async () => { order.push('foreground'); return granted; });
  location.requestBackgroundPermissionsAsync.mockImplementation(async () => { order.push('background'); return granted; });
  for (const [index, { Screen, action, next }] of permissionSteps.entries()) {
    await act(async () => root.render(<Screen />));
    expect(order).toHaveLength(index);
    await press(t(action));
    expect(order).toEqual(['foreground', 'background', 'notifications'].slice(0, index + 1));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(next === null);
    if (next) expect(navigation.router.navigate).toHaveBeenLastCalledWith(next);
  }
  expect(await arrivalStorage.load()).toMatchObject({
    onboardingCompleted: true, preferences: { countryArrivalAlerts: true },
  });
  expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test.each(permissionSteps)(
  'denying $name leaves a way to finish without requesting other permissions', async ({ Screen, action, request }) => {
    request.mockResolvedValue({ granted: false } as NotificationPermissionsStatus);
    await act(async () => root.render(<Screen />));
    await press(t(action));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      t('onboarding.setupLater'), { queue: true },
    );
    await press(t('onboarding.startExploring'));
    expect(request).toHaveBeenCalledTimes(1);
    for (const step of permissionSteps)
      if (step.request !== request) expect(step.request).not.toHaveBeenCalled();
    expect(navigation.router.navigate).not.toHaveBeenCalled();
    expect(await arrivalStorage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
    });
  },
);

test.each(permissionSteps)('repeated presses on $name cannot overlap prompts or skip while pending', async ({ Screen, action, request, next }) => {
  const permission = Promise.withResolvers<NotificationPermissionsStatus>();
  request.mockReturnValueOnce(permission.promise);
  await act(async () => root.render(<Screen />));
  const enable = button(t(action)).props.onPress;
  const skip = button(t('location.notNow')).props.onPress;
  await act(async () => { enable(); enable(); skip(); });
  expect(request).toHaveBeenCalledTimes(1);
  expect(button(t('onboarding.working')).props.disabled).toBe(true);
  expect(button(t('location.notNow')).props.disabled).toBe(true);
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
  await act(async () => permission.resolve(granted));
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(next === null);
});

test.each(permissionSteps)('native errors on $name leave setup skippable', async ({ Screen, action, request }) => {
  request.mockRejectedValueOnce(new Error('Native error'));
  await act(async () => root.render(<Screen />));
  await press(t(action));
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
  await press(t('onboarding.startExploring'));
  expect((await arrivalStorage.load()).preferences.countryArrivalAlerts).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
  expect(navigation.router.navigate).not.toHaveBeenCalled();
});

test.each(permissionSteps)('disabled Location Services on $name never starts a permission prompt', async ({ Screen, action }) => {
  location.hasServicesEnabledAsync.mockResolvedValue(false);
  await act(async () => root.render(<Screen />));
  await press(t(action));
  for (const step of permissionSteps) expect(step.request).not.toHaveBeenCalled();
  await press(t('onboarding.startExploring'));
  expect((await arrivalStorage.load()).onboardingCompleted).toBe(true);
});

test.each(permissionSteps.slice(1))('opening $name without its prerequisite never prompts for another permission', async ({ name, Screen, action }) => {
  const prerequisite = name === 'background' ? location.getForegroundPermissionsAsync : location.getBackgroundPermissionsAsync;
  prerequisite.mockResolvedValue({ granted: false });
  await act(async () => root.render(<Screen />));
  await press(t(action));
  for (const step of permissionSteps) expect(step.request).not.toHaveBeenCalled();
  expect(navigation.router.navigate).not.toHaveBeenCalled();
  await press(t('onboarding.startExploring'));
  expect((await arrivalStorage.load()).preferences.countryArrivalAlerts).toBe(false);
});

test.each(permissionSteps.slice(1))('leaving $name during its prerequisite check prevents a late prompt', async ({ name, Screen, action }) => {
  const permission = Promise.withResolvers<{ granted: boolean }>();
  const prerequisite = name === 'background' ? location.getForegroundPermissionsAsync : location.getBackgroundPermissionsAsync;
  prerequisite.mockReturnValueOnce(permission.promise);
  await act(async () => root.render(<Screen />));
  await press(t(action));
  navigation.focused = false;
  await act(async () => root.render(<Screen />));
  await act(async () => permission.resolve({ granted: true }));
  for (const step of permissionSteps) expect(step.request).not.toHaveBeenCalled();
  expect(navigation.router.navigate).not.toHaveBeenCalled();
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
});

test.each(['expo-go', 'task-unavailable'])('unavailable background arrivals in %s do not request access', async (reason) => {
  if (reason === 'expo-go') constants.executionEnvironment = 'storeClient';
  else tasks.isAvailableAsync.mockResolvedValue(false);
  await act(async () => root.render(<BackgroundPermissionRoute />));
  await press(t('onboarding.allowBackground'));
  for (const step of permissionSteps) expect(step.request).not.toHaveBeenCalled();
  await press(t('onboarding.startExploring'));
  expect((await arrivalStorage.load()).preferences.countryArrivalAlerts).toBe(false);
});

test('foreground location remains available for the map in Expo Go', async () => {
  constants.executionEnvironment = 'storeClient';
  await act(async () => root.render(<LocationPermissionRoute />));
  await press(t('onboarding.allowLocation'));
  expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(navigation.router.navigate).toHaveBeenCalledWith('/onboarding/background');
});

test.each(['location', 'notifications', 'services', 'read-error'])(
  'a %s change during the final prompt cannot enable reminders', async (change) => {
    const permission = Promise.withResolvers<NotificationPermissionsStatus>();
    notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(t('onboarding.allowNotifications'));
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    if (change === 'location') location.getBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    if (change === 'notifications') notifications.getPermissionsAsync.mockResolvedValue({ granted: false } as NotificationPermissionsStatus);
    if (change === 'services') location.hasServicesEnabledAsync.mockResolvedValue(false);
    if (change === 'read-error') location.getBackgroundPermissionsAsync.mockRejectedValue(new Error('Native error'));
    await act(async () => permission.resolve(granted));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    expect(button(t('onboarding.startExploring')).props.disabled).toBe(false);
    await press(t('onboarding.startExploring'));
    expect(await arrivalStorage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
    });
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  },
);

test.each(permissionSteps.slice(0, 2))('a failed skip on $name retries saving without requesting access', async ({ Screen }) => {
  const save = spyOn(arrivalStorage, 'save').mockRejectedValueOnce(new Error('Disk full'));
  try {
    await act(async () => root.render(<Screen />));
    await press(t('location.notNow'));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    await press(t('common.retry'));
    expect(await arrivalStorage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
    });
    for (const step of permissionSteps) expect(step.request).not.toHaveBeenCalled();
  } finally {
    save.mockRestore();
  }
});

test.each(['blur', 'unmount', 'reset', 'restore'])(
  'leaving a permission request through %s prevents further prompts and stale saves', async (change) => {
    const permission = Promise.withResolvers<NotificationPermissionsStatus>();
    notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(t('onboarding.allowNotifications'));
    if (change === 'blur') {
      navigation.focused = false;
      await act(async () => root.render(<NotificationPermissionRoute />));
    } else if (change === 'unmount') await act(async () => root.render(<></>));
    else if (change === 'reset') await act(async () => appData.resetApp());
    else await act(async () => appData.restore({ ...defaultAppData(), places: { jp: 'visited' } }));
    const current = appData.getSnapshot().data;
    await act(async () => permission.resolve(granted));
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(appData.getSnapshot().data).toEqual(current);
  },
);

test('leaving during foreground authorization prevents navigation to the Always step', async () => {
  const permission = Promise.withResolvers<{ granted: boolean }>();
  location.requestForegroundPermissionsAsync.mockReturnValueOnce(permission.promise);
  await act(async () => root.render(<LocationPermissionRoute />));
  await press(t('onboarding.allowLocation'));
  await act(async () => root.render(<></>));
  await act(async () => permission.resolve({ granted: true }));
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  expect(navigation.router.navigate).not.toHaveBeenCalled();
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
});

test.each(['before', 'after'])(
  'a cancelled prompt releases the controls when the screen regains focus %s it settles', async (timing) => {
    const permission = Promise.withResolvers<NotificationPermissionsStatus>();
    notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(t('onboarding.allowNotifications'));
    navigation.focused = false;
    await act(async () => root.render(<NotificationPermissionRoute />));
    if (timing === 'after') await act(async () => permission.resolve(granted));
    navigation.focused = true;
    await act(async () => root.render(<NotificationPermissionRoute />));
    if (timing === 'before') await act(async () => permission.resolve(granted));
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(button(t('location.notNow')).props.disabled).toBe(false);
    await press(t('location.notNow'));
    expect((await arrivalStorage.load()).onboardingCompleted).toBe(true);
  },
);

test('each failed save attempt is announced, including a failed retry', async () => {
  const save = spyOn(arrivalStorage, 'save').mockRejectedValue(new Error('Disk full'));
  try {
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(t('location.notNow'));
    await press(t('common.retry'));
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledTimes(2);
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    expect(button(t('common.retry')).props.disabled).toBe(false);
  } finally {
    save.mockRestore();
  }
});

test('a save failure while away remains retryable and is announced only on return', async () => {
  const pending = Promise.withResolvers<void>();
  const save = spyOn(arrivalStorage, 'save').mockReturnValueOnce(pending.promise);
  try {
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(t('location.notNow'));
    navigation.focused = false;
    await act(async () => root.render(<NotificationPermissionRoute />));
    await act(async () => pending.reject(new Error('Disk full')));
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).not.toHaveBeenCalled();
    navigation.focused = true;
    await act(async () => root.render(<NotificationPermissionRoute />));
    expect(button(t('common.retry')).props.disabled).toBe(false);
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      t('onboarding.saveError'), { queue: true },
    );
    await press(t('common.retry'));
    expect((await arrivalStorage.load()).preferences.countryArrivalAlerts).toBe(false);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  } finally {
    save.mockRestore();
  }
});

test.each([false, true])('a failed save retries the %s reminder choice without repeating prompts', async (alerts) => {
  const save = spyOn(arrivalStorage, 'save').mockRejectedValueOnce(new Error('Disk full'));
  try {
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(alerts ? t('onboarding.allowNotifications') : t('location.notNow'));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    expect(button(t('common.retry')).props.disabled).toBe(false);
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      t('onboarding.saveError'), { queue: true },
    );
    await press(t('common.retry'));
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(alerts ? 1 : 0);
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(await arrivalStorage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: alerts },
    });
  } finally {
    save.mockRestore();
  }
});

test('a failed save after denied permissions retries with reminders off', async () => {
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: false } as NotificationPermissionsStatus);
  const save = spyOn(arrivalStorage, 'save').mockRejectedValueOnce(new Error('Disk full'));
  try {
    await act(async () => root.render(<NotificationPermissionRoute />));
    await press(t('onboarding.allowNotifications'));
    await press(t('onboarding.startExploring'));
    expect(button(t('common.retry')).props.disabled).toBe(false);
    await press(t('common.retry'));
    expect(await arrivalStorage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
    });
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  } finally {
    save.mockRestore();
  }
});

test('route guards expose only Welcome until completion, and reset removes the main routes', async () => {
  await act(async () => root.render(<AppNavigator />));
  expect(routes()).toEqual(['onboarding', 'recovery']);
  await act(async () => appData.completeOnboarding(false));
  expect(routes()[0]).toBe('(tabs)');
  expect(routes()).toContain('country/[id]');
  expect(routes()).not.toContain('onboarding');
  await act(async () => appData.resetApp());
  expect(routes()).toEqual(['onboarding', 'recovery']);
});

test.each(['loading', 'load-error'] as const)('startup during %s does not mistake unread data for a first launch', async (status) => {
  const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue({ ...appData.getSnapshot(), status });
  try {
    await act(async () => root.render(<AppNavigator />));
    expect(routes()).not.toContain('onboarding');
    if (status === 'loading') {
      expect(routes()).toEqual([]);
      expect(root.container.queryAll((node) => node.type === 'DataFeedback')).toHaveLength(1);
    } else {
      expect(routes()).toEqual([]);
      expect(button(t('recovery.savedFile'))).toBeDefined();
      expect(button(t('settings.resetApp'))).toBeDefined();
    }
  } finally {
    await act(async () => root.render(<></>));
    snapshot.mockRestore();
  }
});

test('both navigators honor Reduce Motion', async () => {
  motion.reduced = true;
  for (const screen of [<AppNavigator key="app" />, <OnboardingLayout key="welcome" />]) {
    await act(async () => root.render(screen));
    expect(root.container.queryAll((node) => node.type === 'Stack')[0].props.screenOptions.animation).toBe('none');
  }
});
