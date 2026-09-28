import { describe, expect, test } from 'bun:test';

import { createToastStore } from '../src/feedback/store';

describe('toast lifecycle', () => {
  test('the latest toast replaces an identical message with a fresh identity', () => {
    const store = createToastStore();
    store.showToast({ message: 'Saved' });
    const first = store.getSnapshot()!;
    store.showToast({ message: 'Saved' });
    const latest = store.getSnapshot()!;
    expect(latest.id).not.toBe(first.id);
    expect(latest.message).toBe(first.message);
    expect(latest.visible).toBe(true);
  });

  test('old timers and exit callbacks cannot affect a newer toast', () => {
    const store = createToastStore();
    store.showToast({ message: 'Old message' });
    const oldId = store.getSnapshot()!.id;
    store.showToast({ message: 'New message' });
    const latest = store.getSnapshot()!;
    store.dismissToast(oldId);
    store.removeToast(oldId);
    store.removeToast(latest.id);
    expect(store.getSnapshot()).toBe(latest);
  });

  test('dismissal hides the toast until its exit completes', () => {
    const store = createToastStore();
    store.showToast({ message: 'Saved' });
    const id = store.getSnapshot()!.id;
    store.dismissToast(id);
    const hidden = store.getSnapshot();
    store.dismissToast(id);
    expect(store.getSnapshot()).toBe(hidden);
    expect(hidden).toMatchObject({ id, visible: false });
    store.removeToast(id);
    store.dismissToast(id);
    expect(store.getSnapshot()).toBeNull();
  });

  test('replacement during exit stays visible after the old animation finishes', () => {
    const store = createToastStore();
    store.showToast({ message: 'Old message' });
    const oldId = store.getSnapshot()!.id;
    store.dismissToast(oldId);
    store.showToast({ message: 'New message' });
    const latest = store.getSnapshot();
    store.removeToast(oldId);
    expect(store.getSnapshot()).toBe(latest);
  });
});
