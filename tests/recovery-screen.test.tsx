import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { DataError } from '../src/data/data-error';
import { encodeDocument } from '../src/data/document';
import { defaultAppData } from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import { t } from '../src/localization';
import { arrivalDatabase, arrivalStorage } from './native-location';
import { backupFile, documentPicker, sharing } from './native-sharing';
import { native } from './setup';

mock.module('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
}));
mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
const { RecoveryScreen } = await import('../src/recovery/RecoveryScreen');
let root: Root;
let store: ReturnType<typeof createAppDataStore>;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(async () => {
  await arrivalStorage.clear();
  store = createAppDataStore(arrivalStorage, { confirmStatusChange: async () => true });
  await store.load();
  await store.setStatus(['ca'], 'visited');
  await arrivalStorage.load();
  native.Alert.alert.mockReset();
  native.AccessibilityInfo.announceForAccessibilityWithOptions.mockClear();
  native.Linking.openURL.mockReset().mockResolvedValue(undefined);
  backupFile.text.mockReset().mockResolvedValue(encodeDocument(defaultAppData()));
  backupFile.write.mockClear();
  sharing.shareAsync.mockClear();
  sharing.isAvailableAsync.mockReset().mockResolvedValue(true);
  documentPicker.getDocumentAsync.mockReset().mockResolvedValue({ canceled: false, assets: [{ uri: backupFile.uri, name: 'backup.json', lastModified: 0 }] });
  root = createRoot({ isStrictMode: true });
  await act(async () => root.render(<RecoveryScreen store={store} />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  await arrivalStorage.load();
});
function button(label: string) {
  const buttons = root.container.queryAll((node) => node.type === 'Button' && node.props.label === label);
  expect(buttons).toHaveLength(1);
  return buttons[0];
}
async function press(label: string) { await act(async () => button(label).props.onPress()); }
async function answer(yes: boolean) {
  const choices = native.Alert.alert.mock.calls.at(-1)![2]!;
  await act(async () => choices[yes ? 1 : 0].onPress?.());
}

test.each(['confirm', 'cancel', 'leave'] as const)('reporting from recovery respects %s before opening email', async (action) => {
  await press(t('recovery.moreOptions'));
  await press(t('support.error.label'));
  expect(native.Alert.alert.mock.calls[0][0]).toBe(t('support.error.title'));
  expect(native.Linking.openURL).not.toHaveBeenCalled();
  if (action === 'leave') await act(async () => root.render(<RecoveryScreen store={store} focused={false} />));
  await answer(action !== 'cancel');
  expect(native.Linking.openURL).toHaveBeenCalledTimes(action === 'confirm' ? 1 : 0);
  expect(sharing.shareAsync).not.toHaveBeenCalled();
  expect(backupFile.write).not.toHaveBeenCalled();
});

test('recovery actions wait for initialization and enable when only raw storage is available', async () => {
  await press(t('recovery.moreOptions'));
  await act(async () => root.render(<RecoveryScreen store={undefined} />));
  expect(button(t('settings.resetApp')).props.disabled).toBe(true);
  await press(t('settings.resetApp'));
  expect(native.Alert.alert).not.toHaveBeenCalled();
  await act(async () => root.render(<RecoveryScreen store={null} />));
  expect(button(t('settings.resetApp')).props.disabled).toBe(false);
  await press(t('settings.resetApp'));
  await answer(true);
  expect(await arrivalStorage.readRaw()).toBeNull();
});

test('repeated presses share one confirmation and a cancelled action can be retried after returning', async () => {
  await act(async () => {
    button(t('settings.restoreBackup')).props.onPress();
    button(t('settings.restoreBackup')).props.onPress();
  });
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<RecoveryScreen store={store} focused={false} />));
  await answer(false);
  await act(async () => root.render(<RecoveryScreen store={store} focused />));
  expect(button(t('settings.restoreBackup')).props.disabled).toBe(false);
  await press(t('settings.restoreBackup'));
  await answer(true);
  expect(store.getSnapshot().data.places).toEqual({});
});

test('works without app providers and exports unreadable original bytes', async () => {
  await press(t('recovery.moreOptions'));
  arrivalDatabase.set('app-data', '{ unreadable private saved file');
  await act(async () => root.render(<RecoveryScreen store={null} error={new Error('sensitive raw crash payload')} />));
  await press(t('recovery.savedFile'));
  expect(backupFile.write).toHaveBeenCalledWith('{ unreadable private saved file');
  expect(sharing.shareAsync).toHaveBeenCalledTimes(1);
  expect(root.container.queryAll((node) => node.props.children === 'sensitive raw crash payload')).toHaveLength(0);
  await arrivalStorage.save(defaultAppData());
});

test.each(['picker', 'confirmation'] as const)('cancelling the %s leaves data unchanged', async (stage) => {
  const before = await arrivalStorage.readRaw();
  if (stage === 'picker') documentPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null });
  await press(t('settings.restoreBackup'));
  if (stage === 'confirmation') await answer(false);
  else expect(native.Alert.alert).not.toHaveBeenCalled();
  expect(await arrivalStorage.readRaw()).toBe(before);
  expect(button(t('settings.restoreBackup')).props.disabled).toBe(false);
});

test.each(['blur', 'return', 'data-change'] as const)('a pending restore cannot apply after %s', async (change) => {
  await press(t('settings.restoreBackup'));
  if (change === 'data-change') await act(async () => store.setStatus(['fr'], 'wishlist'));
  else {
    await act(async () => root.render(<RecoveryScreen store={store} focused={false} />));
    if (change === 'return') await act(async () => root.render(<RecoveryScreen store={store} focused />));
  }
  const data = store.getSnapshot().data;
  await answer(true);
  expect(store.getSnapshot().data).toBe(data);
});

test('failed restore preserves data, reports a safe message, and allows retry', async () => {
  const before = store.getSnapshot().data;
  const saving = spyOn(arrivalStorage, 'save').mockRejectedValueOnce(new DataError('storage-write'));
  try {
    await press(t('settings.restoreBackup'));
    await answer(true);
    expect(store.getSnapshot().data).toBe(before);
    expect(native.Alert.alert.mock.calls.at(-1)!.slice(0, 2)).toEqual([t('settings.couldNotFinish'), t('recovery.errors.storage-write')]);
    expect(button(t('settings.restoreBackup')).props.disabled).toBe(false);
    await press(t('settings.restoreBackup'));
    await answer(true);
    expect(store.getSnapshot().data.places).toEqual({});
  } finally { saving.mockRestore(); }
});

test.each([true, false])('successful import stores only the replacement and announces completion with store %p', async (withStore) => {
  await act(async () => root.render(<RecoveryScreen store={withStore ? store : null} />));
  await press(t('settings.restoreBackup'));
  await answer(true);
  expect((await arrivalStorage.load()).places).toEqual({});
  expect([...arrivalDatabase.entries()]).toEqual([['app-data', encodeDocument(defaultAppData())]]);
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
  expect(native.AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(t('recovery.restored'), { queue: true });
});

test('full reset is confirmed, recovers from failure, and retries the app only after success', async () => {
  await press(t('recovery.moreOptions'));
  const retry = mock(async () => {});
  await act(async () => root.render(<RecoveryScreen store={store} onRetry={retry} />));
  const before = await arrivalStorage.readRaw();
  await press(t('settings.resetApp'));
  await answer(false);
  expect(await arrivalStorage.readRaw()).toBe(before);
  const clearing = spyOn(arrivalStorage, 'clear').mockRejectedValueOnce(new DataError('reset-failed'));
  try {
    await press(t('settings.resetApp'));
    await answer(true);
    expect(retry).not.toHaveBeenCalled();
    expect(await arrivalStorage.readRaw()).toBe(before);
    await press(t('settings.resetApp'));
    await answer(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(await arrivalStorage.readRaw()).toBeNull();
  } finally { clearing.mockRestore(); }
});

test('the Router boundary gates the shared store and retries independently of the app shell', async () => {
  const { appData } = await import('../src/data/app-data');
  const { RecoveryBoundary } = await import('../src/recovery/RecoveryBoundary');
  await appData.load();
  const retry = mock(async () => {});
  await act(async () => root.render(<RecoveryBoundary error={new Error('render failed')} retry={retry} />));
  expect(appData.getSnapshot().recovery).toBe(true);
  expect(await appData.setStatus(['jp'], 'visited')).toBe(false);
  await press(t('recovery.retry'));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(appData.getSnapshot().recovery).toBe(false);
});

test('a crash before app initialization still loads the cold store and enables recovery actions', async () => {
  const { appData } = await import('../src/data/app-data');
  const { RecoveryBoundary } = await import('../src/recovery/RecoveryBoundary');
  await import('../src/location/arrival-notifications');
  const cold = createAppDataStore(arrivalStorage, { confirmStatusChange: async () => true });
  const snapshot = spyOn(appData, 'getSnapshot').mockImplementation(cold.getSnapshot);
  const subscribe = spyOn(appData, 'subscribe').mockImplementation(cold.subscribe);
  const load = spyOn(appData, 'load').mockImplementation(cold.load);
  const enter = spyOn(appData, 'enterRecovery').mockImplementation(cold.enterRecovery);
  const leave = spyOn(appData, 'leaveRecovery').mockImplementation(cold.leaveRecovery);
  try {
    await act(async () => root.render(<RecoveryBoundary error={new Error('failed before app initialization')} retry={async () => {}} />));
    expect(load).toHaveBeenCalled();
    expect(cold.getSnapshot()).toMatchObject({ status: 'ready', recovery: true });
    await press(t('recovery.moreOptions'));
    expect(button(t('settings.resetApp')).props.disabled).toBe(false);
    expect(button(t('recovery.savedFile')).props.disabled).toBe(false);
  } finally {
    await act(async () => root.render(<></>));
    snapshot.mockRestore(); subscribe.mockRestore(); load.mockRestore(); enter.mockRestore(); leave.mockRestore();
  }
});

test('failed reads show a short explanation and keep extra tools behind more options', async () => {
  const failed = createAppDataStore(arrivalStorage, { confirmStatusChange: async () => true });
  const loading = spyOn(arrivalStorage, 'load').mockRejectedValueOnce(new DataError('invalid-document'));
  try { await failed.load(); } finally { loading.mockRestore(); }
  await act(async () => root.render(<RecoveryScreen store={failed} />));
  expect(root.container.queryAll((node) => node.props.children === t('recovery.errors.invalid-document'))).toHaveLength(1);
  const buttons = () => root.container.queryAll((node) => node.type === 'Button').map((node) => node.props.label);
  expect(buttons()).toEqual([t('recovery.retry'), t('settings.restoreBackup'), t('recovery.moreOptions')]);
  expect(button(t('recovery.moreOptions')).props.accessibilityState).toEqual({ expanded: false });
  await press(t('recovery.moreOptions'));
  expect(buttons()).toContain(t('recovery.savedFile'));
  expect(buttons()).toContain(t('support.error.label'));
  expect(buttons()).toContain(t('settings.resetApp'));
  expect(button(t('recovery.fewerOptions')).props.accessibilityState).toEqual({ expanded: true });
  await press(t('recovery.fewerOptions'));
  expect(buttons()).not.toContain(t('settings.resetApp'));
});

test.each([false, true])('a newer saved format keeps update guidance visible with crash %p', async (crashed) => {
  const loading = spyOn(arrivalStorage, 'load').mockRejectedValueOnce(new DataError('unsupported-version'));
  try {
    const failed = createAppDataStore(arrivalStorage, { confirmStatusChange: async () => true });
    await failed.load();
    await act(async () => root.render(<RecoveryScreen store={failed} error={crashed ? new Error('render failed') : undefined} />));
    expect(root.container.queryAll((node) => node.props.children === t('recovery.errors.unsupported-version'))).toHaveLength(1);
    expect(root.container.queryAll((node) => node.props.children === t('recovery.loadTitle'))).toHaveLength(1);
    expect(root.container.queryAll((node) => node.props.children === t('recovery.crashMessage'))).toHaveLength(0);
  } finally { loading.mockRestore(); }
});
