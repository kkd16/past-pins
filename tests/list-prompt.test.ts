import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Alert, AlertButton } from 'react-native';

import { MAX_LIST_NAME_LENGTH } from '../src/data/model';
import { validateListName } from '../src/data/validation';
import { t } from '../src/localization';

const prompt = mock<typeof Alert.prompt>();
const alert = mock<typeof Alert.alert>();
mock.module('react-native', () => ({ Alert: { prompt, alert } }));
const { promptListName } = await import('../src/lists/prompt');

function promptButtons(): AlertButton[] {
  const buttons = prompt.mock.calls.at(-1)?.[2];
  if (!Array.isArray(buttons)) throw new Error('Expected a native name prompt');
  return buttons;
}

function submitName(value: string) {
  const save = promptButtons().find(({ style }) => style !== 'cancel');
  if (!save?.onPress) throw new Error('Expected a save action');
  expect(prompt.mock.calls.at(-1)?.[3]).toBe('plain-text');
  // Native plain-text prompts pass a string, unlike login-password prompts.
  const onPress = save.onPress as (value?: string) => void;
  onPress(value);
}

function chooseErrorAction(text: string) {
  const button = alert.mock.calls.at(-1)?.[2]?.find(
    (button) => button.text === text,
  );
  if (!button) throw new Error('Expected an error recovery action');
  button.onPress?.();
}

beforeEach(() => {
  prompt.mockReset();
  alert.mockReset();
});

describe('native list name prompt', () => {
  test.each([
    { original: undefined, title: 'New list', action: 'Create list' },
    { original: 'Nordic trip', title: 'Rename list', action: 'Save' },
  ])('retry preserves input and the $title action', ({ original, title, action }) => {
    const saved = mock<(name: string) => void>();
    promptListName((value) => saved(validateListName(value)), () => true, original);
    expect(prompt.mock.calls.at(-1)?.[4]).toBe(original);

    const invalidName = 'A'.repeat(MAX_LIST_NAME_LENGTH + 1);
    submitName(invalidName);
    expect(saved).not.toHaveBeenCalled();
    expect(alert.mock.calls.at(-1)?.[1]).toBe(
      t('common.errors.invalidListName', { count: MAX_LIST_NAME_LENGTH }),
    );

    chooseErrorAction(t('common.retry'));
    expect(prompt.mock.calls.at(-1)?.[0]).toBe(title);
    expect(prompt.mock.calls.at(-1)?.[4]).toBe(invalidName);
    expect(promptButtons().map(({ text }) => text)).toEqual([
      t('common.cancel'),
      action,
    ]);

    submitName('  Nordic summer  ');
    expect(saved).toHaveBeenCalledTimes(1);
    expect(saved).toHaveBeenCalledWith('Nordic summer');
  });

  test('canceling an error leaves the list unchanged and closes recovery', () => {
    const saved = mock<(name: string) => void>();
    promptListName((value) => saved(validateListName(value)), () => true);
    submitName('');
    chooseErrorAction(t('common.cancel'));
    expect(saved).not.toHaveBeenCalled();
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test('stale actions do not present a native prompt', () => {
    const saved = mock<(name: string) => void>();
    promptListName(saved, () => false);
    expect(prompt).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });

  test('retry does not reopen a prompt after the original action becomes stale', () => {
    let current = true;
    const saved = mock<(name: string) => void>();
    promptListName((value) => saved(validateListName(value)), () => current);
    submitName('');

    current = false;
    chooseErrorAction(t('common.retry'));
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
  });

  test('an open prompt cannot save after its action becomes stale', () => {
    let current = true;
    const saved = mock<(name: string) => void>();
    promptListName(saved, () => current);
    current = false;
    submitName('Nordic summer');
    expect(saved).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });
});
