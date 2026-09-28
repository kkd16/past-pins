import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';

import { DataError } from '../src/data/data-error';
import { t } from '../src/localization';
import website from '../src/localization/locales/en/website.json';
import { diagnosticLog } from './native-location';
import { device, mailComposer, native } from './setup';

const { composeSupportEmail } = await import('../src/support/compose-email');
let reading: ReturnType<typeof spyOn<typeof diagnosticLog, 'getEvents'>>;

beforeEach(async () => {
  await diagnosticLog.clear();
  native.Alert.alert.mockReset();
  mailComposer.isAvailableAsync.mockReset().mockResolvedValue(true);
  mailComposer.composeAsync.mockReset().mockResolvedValue({ status: 'cancelled' });
  reading = spyOn(diagnosticLog, 'getEvents');
});

afterEach(() => reading.mockRestore());

function consent(accepted: boolean) {
  const buttons = native.Alert.alert.mock.calls[0][2]!;
  buttons[accepted ? 1 : 0].onPress?.();
}

test.each(['error', 'bug', 'feature'] as const)('cancelled %s consent never reads diagnostics or opens email', async (kind) => {
  const pending = composeSupportEmail(kind, () => true);
  expect(native.Alert.alert.mock.calls[0].slice(0, 2)).toEqual([
    t(`support.${kind}.title`), t('support.consent', { details: t(`support.${kind}.details`) }),
  ]);
  expect(native.Alert.alert.mock.calls[0][1]).not.toContain(website.shared.contact);
  expect(reading).not.toHaveBeenCalled();
  expect(mailComposer.isAvailableAsync).not.toHaveBeenCalled();
  consent(false);
  await pending;
  expect(reading).not.toHaveBeenCalled();
  expect(mailComposer.composeAsync).not.toHaveBeenCalled();
});

test('Settings bug reports include basic technical details without reading the error log', async () => {
  reading.mockRejectedValueOnce(new Error('Diagnostics should not be read'));
  const pending = composeSupportEmail('bug', () => true);
  consent(true);
  await pending;
  const [draft] = mailComposer.composeAsync.mock.calls[0];
  expect(draft.recipients).toEqual([website.shared.contact]);
  expect(draft.subject).toBe(t('support.bug.subject'));
  expect(JSON.parse(draft.body!.slice(draft.body!.indexOf('{')))).toEqual({
    appVersion: '1.0.0', build: '1',
    device: { manufacturer: 'Apple', model: 'iPhone 16', os: 'iOS', osVersion: '18.0' },
  });
  expect(reading).not.toHaveBeenCalled();
});

test('feature requests contain only writing prompts, without diagnostics or device details', async () => {
  reading.mockRejectedValueOnce(new Error('Diagnostics should not be read'));
  const pending = composeSupportEmail('feature', () => true);
  consent(true);
  await pending;
  expect(mailComposer.composeAsync).toHaveBeenCalledWith({
    recipients: [website.shared.contact],
    subject: t('support.feature.subject'),
    body: t('support.feature.body'),
  });
  expect(reading).not.toHaveBeenCalled();
});

test('consent opens an editable email with safe diagnostics and only allowlisted device fields', async () => {
  diagnosticLog.record('load', new DataError('storage-read', undefined, { cause: new Error('private saved places') }));
  const pending = composeSupportEmail('error', () => true);
  consent(true);
  await pending;
  const [draft] = mailComposer.composeAsync.mock.calls[0];
  expect(draft.recipients).toEqual(['kyledeliyannides@outlook.com']);
  expect(draft.subject).toBe(t('support.error.subject'));
  const report = JSON.parse(draft.body!.slice(draft.body!.indexOf('{')));
  expect(report.appVersion).toBe('1.0.0');
  expect(report.build).toBe('1');
  expect(report.events).toHaveLength(1);
  expect(report.events[0]).toMatchObject({ operation: 'load', code: 'storage-read' });
  expect(report.device).toEqual({
    manufacturer: 'Apple', model: 'iPhone 16', os: 'iOS', osVersion: '18.0',
  });
  expect(draft.body).not.toContain(device.deviceName);
  expect(draft.body).not.toContain(device.uniqueId);
  expect(draft.body).not.toContain('private saved places');
  expect(draft.attachments).toBeUndefined();
});

test('unavailable Mail explains setup without reading or sharing diagnostics', async () => {
  mailComposer.isAvailableAsync.mockResolvedValueOnce(false);
  const pending = composeSupportEmail('error', () => true);
  consent(true);
  await pending;
  expect(native.Alert.alert.mock.calls.at(-1)!.slice(0, 2)).toEqual([
    t('support.emailUnavailable'), t('support.emailSetup'),
  ]);
  expect(reading).not.toHaveBeenCalled();
  expect(mailComposer.composeAsync).not.toHaveBeenCalled();
});

test.each(['consent', 'availability', 'getEvents'] as const)('leaving during %s prevents email from opening', async (stage) => {
  let current = true;
  if (stage === 'availability') mailComposer.isAvailableAsync.mockImplementationOnce(async () => { current = false; return true; });
  if (stage === 'getEvents') reading.mockImplementationOnce(async () => { current = false; return []; });
  const pending = composeSupportEmail('error', () => current);
  if (stage === 'consent') current = false;
  consent(true);
  await pending;
  expect(mailComposer.composeAsync).not.toHaveBeenCalled();
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
});

test('concurrent reports share one consent flow and cancelling permits another attempt', async () => {
  const first = composeSupportEmail('error', () => true);
  await composeSupportEmail('bug', () => true);
  expect(native.Alert.alert).toHaveBeenCalledTimes(1);
  consent(false);
  await first;
  native.Alert.alert.mockClear();
  const second = composeSupportEmail('feature', () => true);
  consent(true);
  await second;
  expect(mailComposer.composeAsync).toHaveBeenCalledTimes(1);
});

test.each(['availability', 'getEvents', 'compose'] as const)('a failed %s shows a safe message and permits retry', async (stage) => {
  const error = new Error('private native failure');
  if (stage === 'availability') mailComposer.isAvailableAsync.mockRejectedValueOnce(error);
  if (stage === 'getEvents') reading.mockRejectedValueOnce(error);
  if (stage === 'compose') mailComposer.composeAsync.mockRejectedValueOnce(error);
  const first = composeSupportEmail('error', () => true);
  consent(true);
  await first;
  expect(native.Alert.alert.mock.calls.at(-1)!.slice(0, 2)).toEqual([
    t('support.emailFailed'), t('support.emailRetry'),
  ]);
  native.Alert.alert.mockClear();
  const second = composeSupportEmail('error', () => true);
  consent(true);
  await second;
  expect(mailComposer.composeAsync).toHaveBeenCalledTimes(stage === 'compose' ? 2 : 1);
});
