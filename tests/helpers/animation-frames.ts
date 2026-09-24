import { afterEach, beforeEach } from 'bun:test';

export function mockAnimationFrames() {
  const pending = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  let time = 0;
  let request: PropertyDescriptor | undefined;
  let cancel: PropertyDescriptor | undefined;

  beforeEach(() => {
    request = Object.getOwnPropertyDescriptor(
      globalThis,
      'requestAnimationFrame',
    );
    cancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
    nextId = 0;
    time = 0;
    pending.clear();
    globalThis.requestAnimationFrame = (callback) => {
      pending.set(++nextId, callback);
      return nextId;
    };
    globalThis.cancelAnimationFrame = (id) => {
      if (id != null) pending.delete(id);
    };
  });

  afterEach(() => {
    pending.clear();
    for (const [key, descriptor] of [
      ['requestAnimationFrame', request],
      ['cancelAnimationFrame', cancel],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });

  return {
    get pendingCount() {
      return pending.size;
    },
    advance(count = 1) {
      for (let index = 0; index < count; index++) {
        time += 1000 / 60;
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach((callback) => callback(time));
      }
    },
  };
}
