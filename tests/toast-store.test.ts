import { describe, expect, mock, test } from 'bun:test';

import { defaultAppData } from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import { createToastStore } from '../src/feedback/store';

describe('toast lifecycle', () => {
  test('the latest toast replaces an identical message with a fresh identity', () => {
    const store = createToastStore();
    const onDismiss = mock();
    store.showToast({ message: 'Place updated', onDismiss });
    const first = store.getSnapshot()!;
    store.showToast({ message: 'Place updated' });
    const latest = store.getSnapshot()!;
    expect(latest.id).not.toBe(first.id);
    expect(latest.message).toBe(first.message);
    expect(latest.visible).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('old timers, actions, and exit callbacks cannot affect the new toast', () => {
    const store = createToastStore();
    const oldAction = mock();
    const newAction = mock();
    const oldTimer = store.showToast({
      message: 'Old message',
      action: { label: 'Undo', onPress: oldAction },
    });
    const oldId = store.getSnapshot()!.id;
    store.showToast({
      message: 'New message',
      action: { label: 'Undo', onPress: newAction },
    });
    const latest = store.getSnapshot()!;
    oldTimer();
    store.dismissToast(oldId);
    store.pressAction(oldId);
    store.removeToast(oldId);
    store.removeToast(latest.id);
    expect(store.getSnapshot()).toBe(latest);
    expect(oldAction).not.toHaveBeenCalled();
    expect(newAction).not.toHaveBeenCalled();
  });

  test('dismissal runs cleanup once and hides the toast until its exit completes', () => {
    const store = createToastStore();
    const onDismiss = mock();
    const onPress = mock();
    const dismiss = store.showToast({
      message: 'Place updated',
      action: { label: 'Undo', onPress },
      onDismiss,
    });
    const id = store.getSnapshot()!.id;
    dismiss();
    store.dismissToast(id);
    store.pressAction(id);
    expect(store.getSnapshot()).toMatchObject({ id, visible: false });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    store.removeToast(id);
    store.removeToast(id);
    dismiss();
    expect(store.getSnapshot()).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('replacing a toast during exit does not repeat its dismissal cleanup', () => {
    const store = createToastStore();
    const onDismiss = mock();
    const dismiss = store.showToast({ message: 'Old message', onDismiss });
    const oldId = store.getSnapshot()!.id;
    dismiss();
    store.showToast({ message: 'New message' });
    const latest = store.getSnapshot();
    store.removeToast(oldId);
    expect(store.getSnapshot()).toBe(latest);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('an unavailable action stays visible and a successful action dismisses', () => {
    const store = createToastStore();
    const onDismiss = mock();
    const onPress = mock<() => boolean | void>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    store.showToast({
      message: 'Place updated',
      action: { label: 'Undo', onPress },
      onDismiss,
    });
    const toast = store.getSnapshot()!;
    store.pressAction(toast.id);
    expect(store.getSnapshot()).toBe(toast);
    expect(onDismiss).not.toHaveBeenCalled();
    store.pressAction(toast.id);
    expect(store.getSnapshot()?.visible).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    store.pressAction(toast.id);
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  test('an action that shows a new toast leaves its replacement visible', () => {
    const store = createToastStore();
    const onDismiss = mock();
    store.showToast({
      message: 'First action',
      action: {
        label: 'Continue',
        onPress: () => {
          store.showToast({ message: 'Action finished' });
          return true;
        },
      },
      onDismiss,
    });
    const oldId = store.getSnapshot()!.id;
    store.pressAction(oldId);
    expect(store.getSnapshot()).toMatchObject({
      message: 'Action finished',
      visible: true,
    });
    expect(store.getSnapshot()!.id).not.toBe(oldId);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('replacing Undo toasts preserves the latest travel change for its matching action', async () => {
    const data = createAppDataStore(
      { load: async () => defaultAppData(), save: async () => undefined },
      { confirmHomeChange: async () => true },
    );
    const toasts = createToastStore();
    const showUndo = () => {
      const pending = data.getSnapshot().pendingUndo!;
      return toasts.showToast({
        message: pending.label,
        action: { label: 'Undo', onPress: () => data.undo(pending.id) },
        onDismiss: () => data.discardUndo(pending.id),
      });
    };
    await data.load();
    await data.setStatus(['ca'], 'visited');
    const dismissOld = showUndo();
    await data.setStatus(['fr'], 'visited');
    const latestUndo = data.getSnapshot().pendingUndo;
    showUndo();
    dismissOld();
    expect(data.getSnapshot().pendingUndo).toBe(latestUndo);
    toasts.pressAction(toasts.getSnapshot()!.id);
    expect(data.getSnapshot().data.places).toEqual({ ca: 'visited' });
    expect(data.getSnapshot().pendingUndo).toBeNull();
    expect(toasts.getSnapshot()?.visible).toBe(false);
  });
});
