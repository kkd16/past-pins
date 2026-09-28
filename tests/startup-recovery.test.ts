import { afterEach, expect, mock, test } from 'bun:test';
import { constants } from './native-location';

const nativeModule = { getStartupResetStatus: mock(() => 'none') };
const requireNativeModule = mock(() => nativeModule);
mock.module('expo', () => ({ requireNativeModule }));
const { assertStartupResetComplete } = await import('../modules/past-pins-recovery/src/PastPinsRecoveryModule');

afterEach(() => {
  constants.executionEnvironment = 'bare';
  requireNativeModule.mockReset().mockReturnValue(nativeModule);
  nativeModule.getStartupResetStatus.mockReset().mockReturnValue('none');
});

test.each(['none', 'completed'])('startup status %s allows storage access', (status) => {
  nativeModule.getStartupResetStatus.mockReturnValue(status);
  expect(() => assertStartupResetComplete()).not.toThrow();
});

test('failed native reset or a stale development build blocks storage access', () => {
  nativeModule.getStartupResetStatus.mockReturnValue('failed');
  expect(() => assertStartupResetComplete()).toThrow('reset-failed');
  requireNativeModule.mockImplementationOnce(() => { throw new Error('module missing'); });
  expect(() => assertStartupResetComplete()).toThrow('reset-failed');
});

test('Expo Go explicitly bypasses the unavailable native reset module', () => {
  constants.executionEnvironment = 'storeClient';
  assertStartupResetComplete();
  expect(requireNativeModule).not.toHaveBeenCalled();
});

test('a failed cold reset keeps access blocked until native ownership cleanup completes', () => {
  nativeModule.getStartupResetStatus.mockReturnValue('failed');
  expect(() => assertStartupResetComplete()).toThrow('reset-failed');
  expect(() => assertStartupResetComplete()).toThrow('reset-failed');
  nativeModule.getStartupResetStatus.mockReturnValue('completed');
  expect(() => assertStartupResetComplete()).not.toThrow();
});
