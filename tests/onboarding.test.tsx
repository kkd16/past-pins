import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import { act, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { defaultAppData } from '../src/data/model';
import { t } from '../src/localization';
import { native, navigation } from './setup';
import { arrivalStorage, constants, location, notifications, tasks } from './native-location';

const { appData } = await import('../src/data/app-data');
const motion = { reduced: false };
mock.module('../src/data/AppDataProvider', () => ({
  useAppData: () => ({
    ...appData,
    ...useSyncExternalStore(appData.subscribe, appData.getSnapshot),
  }),
}));
mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../src/components/Screen', () => ({ Screen: 'Screen' }));
mock.module('../src/components/DataFeedback', () => ({ DataFeedback: 'DataFeedback' }));
mock.module('../src/stamps/CountryStamp', () => ({ CountryStamp: 'CountryStamp' }));
mock.module('../src/motion/ReducedMotion', () => ({ useReducedMotion: () => motion.reduced }));

const { RemindersScreen } = await import('../src/screens/RemindersScreen');
const { AppNavigator } = await import('../src/navigation/AppNavigator');
const { default: WelcomeRoute } = await import('../src/app/onboarding');
const { default: OnboardingLayout } = await import('../src/app/onboarding/_layout');
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
  location.startLocationUpdatesAsync.mockClear();
  notifications.requestPermissionsAsync.mockReset().mockResolvedValue(granted);
  tasks.isAvailableAsync.mockReset().mockResolvedValue(true);
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

test('Welcome introduces the app and continues through Router without requesting access', async () => {
  await act(async () => root.render(<WelcomeRoute />));
  await press(t('onboarding.continue'));
  expect(navigation.router.navigate).toHaveBeenCalledWith('/onboarding/reminders');
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

test('Not now saves completion with reminders off and makes no permission requests', async () => {
  await act(async () => root.render(<RemindersScreen />));
  await press(t('location.notNow'));
  expect(await arrivalStorage.load()).toMatchObject({
    onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
  });
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

test('opt-in requests permissions in order and persists the choice before monitoring can start', async () => {
  const order: string[] = [];
  notifications.requestPermissionsAsync.mockImplementation(async () => { order.push('notifications'); return granted; });
  location.requestForegroundPermissionsAsync.mockImplementation(async () => { order.push('foreground'); return granted; });
  location.requestBackgroundPermissionsAsync.mockImplementation(async () => { order.push('background'); return granted; });
  await act(async () => root.render(<RemindersScreen />));
  expect(order).toEqual([]);
  await press(t('onboarding.enableReminders'));
  expect(order).toEqual(['notifications', 'foreground', 'background']);
  expect(await arrivalStorage.load()).toMatchObject({
    onboardingCompleted: true, preferences: { countryArrivalAlerts: true },
  });
  // The root arrival observer owns startup after completion, not this screen.
  expect(location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test.each(['notifications', 'foreground', 'background', 'services', 'expo-go', 'native error'])(
  '%s failure leaves a clear way to continue with reminders off', async (failure) => {
    if (failure === 'notifications') notifications.requestPermissionsAsync.mockResolvedValue({ granted: false } as NotificationPermissionsStatus);
    if (failure === 'foreground') location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    // Includes Allow Once followed by a silently denied Always request on iOS.
    if (failure === 'background') location.requestBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    if (failure === 'services') location.hasServicesEnabledAsync.mockResolvedValue(false);
    if (failure === 'expo-go') constants.executionEnvironment = 'storeClient';
    if (failure === 'native error') notifications.requestPermissionsAsync.mockRejectedValue(new Error('Native error'));
    await act(async () => root.render(<RemindersScreen />));
    await press(t('onboarding.enableReminders'));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    expect(appData.getSnapshot().data.preferences.countryArrivalAlerts).toBe(false);
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      t('onboarding.remindersOff'), { queue: true },
    );
    const requests = notifications.requestPermissionsAsync.mock.calls.length;
    await press(t('onboarding.startExploring'));
    expect(notifications.requestPermissionsAsync.mock.calls.length).toBe(requests);
    expect(await arrivalStorage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: false },
    });
    if (failure === 'notifications') expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    if (failure === 'foreground') expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  },
);

test('repeated presses cannot overlap prompts or skip while the opt-in is pending', async () => {
  const permission = Promise.withResolvers<NotificationPermissionsStatus>();
  notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
  await act(async () => root.render(<RemindersScreen />));
  const enable = button(t('onboarding.enableReminders')).props.onPress;
  const skip = button(t('location.notNow')).props.onPress;
  await act(async () => { enable(); enable(); skip(); });
  expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(button(t('onboarding.working')).props.disabled).toBe(true);
  expect(button(t('location.notNow')).props.disabled).toBe(true);
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
  await act(async () => permission.resolve(granted));
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(true);
});

test.each(['blur', 'unmount', 'reset', 'restore'])(
  'leaving a permission request through %s prevents further prompts and stale saves', async (change) => {
    const permission = Promise.withResolvers<NotificationPermissionsStatus>();
    notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    await act(async () => root.render(<RemindersScreen />));
    await press(t('onboarding.enableReminders'));
    if (change === 'blur') {
      navigation.focused = false;
      await act(async () => root.render(<RemindersScreen />));
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

test('leaving during foreground authorization prevents the Always request', async () => {
  const permission = Promise.withResolvers<{ granted: boolean }>();
  location.requestForegroundPermissionsAsync.mockReturnValueOnce(permission.promise);
  await act(async () => root.render(<RemindersScreen />));
  await press(t('onboarding.enableReminders'));
  await act(async () => root.render(<></>));
  await act(async () => permission.resolve({ granted: true }));
  expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
});

test.each(['before', 'after'])(
  'a cancelled prompt releases the controls when the screen regains focus %s it settles', async (timing) => {
    const permission = Promise.withResolvers<NotificationPermissionsStatus>();
    notifications.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    await act(async () => root.render(<RemindersScreen />));
    await press(t('onboarding.enableReminders'));
    navigation.focused = false;
    await act(async () => root.render(<RemindersScreen />));
    if (timing === 'after') await act(async () => permission.resolve(granted));
    navigation.focused = true;
    await act(async () => root.render(<RemindersScreen />));
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
    await act(async () => root.render(<RemindersScreen />));
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
    await act(async () => root.render(<RemindersScreen />));
    await press(t('location.notNow'));
    navigation.focused = false;
    await act(async () => root.render(<RemindersScreen />));
    await act(async () => pending.reject(new Error('Disk full')));
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).not.toHaveBeenCalled();
    navigation.focused = true;
    await act(async () => root.render(<RemindersScreen />));
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
    await act(async () => root.render(<RemindersScreen />));
    await press(alerts ? t('onboarding.enableReminders') : t('location.notNow'));
    expect(appData.getSnapshot().data.onboardingCompleted).toBe(false);
    expect(button(t('common.retry')).props.disabled).toBe(false);
    expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      t('onboarding.saveError'), { queue: true },
    );
    await press(t('common.retry'));
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(alerts ? 1 : 0);
    expect(location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(alerts ? 1 : 0);
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
    await act(async () => root.render(<RemindersScreen />));
    await press(t('onboarding.enableReminders'));
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
  expect(routes()).toEqual(['onboarding']);
  await act(async () => appData.completeOnboarding(false));
  expect(routes()[0]).toBe('(tabs)');
  expect(routes()).toContain('country/[id]');
  expect(routes()).not.toContain('onboarding');
  await act(async () => appData.resetApp());
  expect(routes()).toEqual(['onboarding']);
});

test.each(['loading', 'load-error'] as const)('startup during %s does not mistake unread data for a first launch', async (status) => {
  const snapshot = spyOn(appData, 'getSnapshot').mockReturnValue({ ...appData.getSnapshot(), status });
  try {
    await act(async () => root.render(<AppNavigator />));
    expect(routes()).not.toContain('onboarding');
    if (status === 'loading') {
      expect(routes()).toEqual([]);
      expect(root.container.queryAll((node) => node.type === 'DataFeedback')).toHaveLength(1);
    } else expect(routes()).toContain('settings/index');
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
