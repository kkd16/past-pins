import { expect, mock } from 'bun:test';

import { t } from '../../src/localization';
import '../native-location';
import { mailComposer, native } from '../setup';

const scenario = process.argv[2];
mock.module('expo-device', () => { throw new Error('Private device module failure'); });
if (scenario === 'mail') {
  mock.module('expo-mail-composer', () => { throw new Error('Private mail module failure'); });
}

const { composeSupportEmail } = await import('../../src/support/compose-email');
expect(native.Alert.alert).not.toHaveBeenCalled();
const kind = scenario === 'feature' ? 'feature' : 'error';
const pending = composeSupportEmail(kind, () => true);
expect(native.Alert.alert.mock.calls[0][0]).toBe(t(`support.${kind}.title`));
native.Alert.alert.mock.calls[0][2]![1].onPress?.();
await pending;

if (scenario === 'feature') {
  expect(mailComposer.composeAsync).toHaveBeenCalledTimes(1);
  expect(mailComposer.composeAsync.mock.calls[0][0].body).toBe(t('support.feature.body'));
} else {
  expect(native.Alert.alert.mock.calls.at(-1)!.slice(0, 2)).toEqual([
    t('support.emailFailed'), t('support.emailRetry'),
  ]);
  expect(mailComposer.composeAsync).not.toHaveBeenCalled();
}
process.stdout.write('passed');
