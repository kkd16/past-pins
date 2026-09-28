import { expect, mock } from 'bun:test';

import { t } from '../../src/localization';
import '../native-location';
import { native } from '../setup';

const scenario = process.argv[2];
mock.module('expo-device', () => { throw new Error('Private device module failure'); });

const { composeSupportEmail } = await import('../../src/support/compose-email');
expect(native.Alert.alert).not.toHaveBeenCalled();
const kind = scenario === 'feature' ? 'feature' : 'error';
const pending = composeSupportEmail(kind, () => true);
expect(native.Alert.alert.mock.calls[0][0]).toBe(t(`support.${kind}.title`));
native.Alert.alert.mock.calls[0][2]![1].onPress?.();
await pending;

if (scenario === 'feature') {
  expect(native.Linking.openURL).toHaveBeenCalledTimes(1);
  expect(new URL(native.Linking.openURL.mock.calls[0][0]).searchParams.get('body')?.replace(/\r\n/g, '\n')).toBe(t('support.feature.body'));
} else {
  expect(native.Alert.alert.mock.calls.at(-1)!.slice(0, 2)).toEqual([
    t('support.emailFailed'), t('support.emailRetry'),
  ]);
  expect(native.Linking.openURL).not.toHaveBeenCalled();
}
process.stdout.write('passed');
