import { afterEach, beforeEach, expect, jest, mock, test } from 'bun:test';
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { t } from '../src/localization';
import { native } from './setup';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../src/components/IconButton', () => ({ IconButton: 'IconButton' }));
mock.module('../src/motion/ReducedMotion', () => ({
  useReducedMotion: () => true,
}));

const { Toast } = await import('../src/feedback/Toast');
type Props = ComponentProps<typeof Toast>;
let root: Root;
let props: Props;
let screenReaderChanged: (enabled: boolean) => void;

beforeEach(() => {
  jest.useFakeTimers();
  native.AccessibilityInfo.isScreenReaderEnabled.mockReset().mockResolvedValue(false);
  native.AccessibilityInfo.addEventListener.mockReset().mockImplementation(
    (event, listener) => {
      if (event === 'screenReaderChanged') screenReaderChanged = listener;
      return { remove: () => {} };
    },
  );
  root = createRoot({ isStrictMode: true });
  props = {
    toast: {
      id: 1,
      message: t('common.listUpdated'),
      visible: true,
      action: { label: t('common.undo'), onPress: mock() },
    },
    actionDisabled: false,
    onDismiss: mock(),
    onRemove: mock(),
    onAction: mock(),
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  jest.useRealTimers();
});

async function render() {
  await act(async () => root.render(<Toast {...props} />));
}

async function advance(milliseconds: number) {
  await act(async () => jest.advanceTimersByTime(milliseconds));
}

test('VoiceOver keeps Undo available until the user acts or dismisses it', async () => {
  native.AccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(true);
  await render();
  await advance(60_000);
  expect(props.onDismiss).not.toHaveBeenCalled();

  const undo = root.container.queryAll((node) => node.type === 'Button');
  expect(undo).toHaveLength(1);
  await act(async () => undo[0].props.onPress());
  expect(props.onAction).toHaveBeenCalledTimes(1);

  const close = root.container.queryAll((node) => node.type === 'IconButton');
  expect(close).toHaveLength(1);
  expect(close[0].props.accessibilityLabel).toBe(t('common.dismissNotification'));
  await act(async () => close[0].props.onPress());
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});

test.each([false, true])('ordinary notices still expire with VoiceOver %s', async (enabled) => {
  native.AccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(enabled);
  props.toast = { ...props.toast, action: undefined };
  await render();
  const duration = enabled ? 15_000 : 6_000;
  await advance(duration - 1);
  expect(props.onDismiss).not.toHaveBeenCalled();
  await advance(1);
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});

test('enabling VoiceOver cancels a running Undo timeout and disabling it restarts one', async () => {
  await render();
  await advance(5_000);
  await act(async () => screenReaderChanged(true));
  await advance(60_000);
  expect(props.onDismiss).not.toHaveBeenCalled();
  await act(async () => screenReaderChanged(false));
  await advance(5_999);
  expect(props.onDismiss).not.toHaveBeenCalled();
  await advance(1);
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});
