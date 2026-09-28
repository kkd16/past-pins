import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';

import { DataError } from '../src/data/data-error';
import { t } from '../src/localization';
import website from '../src/localization/locales/en/website.json';
import { diagnosticLog } from './native-location';
import { device, native } from './setup';

const { composeSupportEmail } = await import('../src/support/compose-email');
let reading: ReturnType<typeof spyOn<typeof diagnosticLog, 'getEvents'>>;

beforeEach(async () => {
  await diagnosticLog.clear();
  native.Alert.alert.mockReset();
  native.Linking.openURL.mockReset().mockResolvedValue(undefined);
  reading = spyOn(diagnosticLog, 'getEvents');
});

afterEach(() => reading.mockRestore());

function consent(accepted: boolean) {
  const buttons = native.Alert.alert.mock.calls[0][2]!;
  buttons[accepted ? 1 : 0].onPress?.();
}

function draft() {
  const [url] = native.Linking.openURL.mock.calls[0];
  const parsed = new URL(url);
  expect(parsed.protocol).toBe('mailto:');
  expect([...parsed.searchParams.keys()]).toEqual(['subject', 'body']);
  return {
    recipient: parsed.pathname,
    subject: parsed.searchParams.get('subject'),
    body: parsed.searchParams.get('body')!.replace(/\r\n/g, '\n'),
  };
}

test.each(['error', 'bug', 'feature'] as const)('cancelled %s consent never reads diagnostics or opens email', async (kind) => {
  const pending = composeSupportEmail(kind, () => true);
  expect(native.Alert.alert.mock.calls[0].slice(0, 2)).toEqual([
    t(`support.${kind}.title`), t('support.consent', { details: t(`support.${kind}.details`) }),
  ]);
  expect(native.Alert.alert.mock.calls[0][1]).not.toContain(website.shared.contact);
  expect(reading).not.toHaveBeenCalled();
  expect(native.Linking.openURL).not.toHaveBeenCalled();
  consent(false);
  await pending;
  expect(reading).not.toHaveBeenCalled();
  expect(native.Linking.openURL).not.toHaveBeenCalled();
});

test('Settings bug reports include basic technical details without reading the error log', async () => {
  reading.mockRejectedValueOnce(new Error('Diagnostics should not be read'));
  const pending = composeSupportEmail('bug', () => true);
  consent(true);
  await pending;
  const email = draft();
  expect(email.recipient).toBe(website.shared.contact);
  expect(email.subject).toBe(t('support.bug.subject'));
  expect(JSON.parse(email.body.slice(email.body.indexOf('{')))).toEqual({
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
  expect(draft()).toEqual({
    recipient: website.shared.contact,
    subject: t('support.feature.subject'),
    body: t('support.feature.body'),
  });
  expect(reading).not.toHaveBeenCalled();
});

test('consent opens an editable email with safe diagnostics and only allowlisted device fields', async () => {
  for (let i = 0; i < 55; i++) {
    diagnosticLog.record('load', new DataError('storage-read', undefined, { cause: new Error('private saved places') }));
  }
  const pending = composeSupportEmail('error', () => true);
  consent(true);
  await pending;
  const email = draft();
  expect(email.recipient).toBe('kyledeliyannides@outlook.com');
  expect(email.subject).toBe(t('support.error.subject'));
  const report = JSON.parse(email.body.slice(email.body.indexOf('{')));
  expect(report.appVersion).toBe('1.0.0');
  expect(report.build).toBe('1');
  expect(report.events).toHaveLength(50);
  expect(report.events).toEqual(await diagnosticLog.getEvents());
  expect(report.events[0]).toMatchObject({ operation: 'load', code: 'storage-read' });
  expect(report.device).toEqual({
    manufacturer: 'Apple', model: 'iPhone 16', os: 'iOS', osVersion: '18.0',
  });
  expect(email.body).not.toContain(device.deviceName);
  expect(email.body).not.toContain(device.uniqueId);
  expect(email.body).not.toContain('private saved places');
});

test('email URLs preserve Unicode and reserved characters without adding headers', async () => {
  diagnosticLog.record('load', new DataError('storage-read'));
  const events = await diagnosticLog.getEvents();
  events[0].appVersion = 'é &cc=someone@example.com?subject=changed#%+ 🧭';
  reading.mockResolvedValueOnce(events);
  const pending = composeSupportEmail('error', () => true);
  consent(true);
  await pending;
  const email = draft();
  expect(JSON.parse(email.body.slice(email.body.indexOf('{'))).events).toEqual(events);
  const [url] = native.Linking.openURL.mock.calls[0];
  expect(url).not.toMatch(/[\r\n ]/);
  expect(url).toContain('%0D%0A');
  expect(url).not.toContain('%0A%0A');
});

test.each(['consent', 'getEvents'] as const)('leaving during %s prevents email from opening', async (stage) => {
  let current = true;
  if (stage === 'getEvents') reading.mockImplementationOnce(async () => { current = false; return []; });
  const pending = composeSupportEmail('error', () => current);
  if (stage === 'consent') current = false;
  consent(true);
  await pending;
  expect(native.Linking.openURL).not.toHaveBeenCalled();
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
  expect(native.Linking.openURL).toHaveBeenCalledTimes(1);
});

test.each(['getEvents', 'openURL'] as const)('a failed %s shows a safe message and permits retry', async (stage) => {
  const error = new Error('private native failure');
  if (stage === 'getEvents') reading.mockRejectedValueOnce(error);
  if (stage === 'openURL') native.Linking.openURL.mockRejectedValueOnce(error);
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
  expect(native.Linking.openURL).toHaveBeenCalledTimes(stage === 'openURL' ? 2 : 1);
});
