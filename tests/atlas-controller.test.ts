import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { FlatController } from '../src/atlas/FlatController';
import { GlobeController } from '../src/globe/controller';

describe('atlas camera transitions', () => {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let nextId = 0;
  let time = 0;
  const pending = new Map<number, FrameRequestCallback>();
  beforeEach(() => {
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
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  });
  function frame() {
    time += 1000 / 60;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(time));
  }

  test('flat transitions coalesce changes, settle, and stop when hidden or interrupted', () => {
    const camera = new FlatCamera();
    const draw = mock();
    const controller = new FlatController(camera, draw);
    controller.resize(390, 844);
    expect(pending.size).toBe(0);
    controller.setActive(true);
    controller.setReduceMotion(false);
    const start = [...camera.center];
    controller.move(() => camera.focus('fr'));
    expect(camera.center).toEqual(start);
    expect(pending.size).toBe(1);
    for (let i = 0; i < 40; i++) frame();
    expect(camera.center).not.toEqual(start);
    expect(pending.size).toBe(0);
    const target = [...camera.center];
    controller.move(() => camera.focus('fr'));
    for (let i = 0; i < 40; i++) frame();
    expect(camera.center).toEqual(target);
    controller.move(() => camera.focus('ca'));
    controller.setActive(false);
    expect(pending.size).toBe(0);
    const before = [...camera.center];
    frame();
    expect(camera.center).toEqual(before);
    controller.setActive(true);
    controller.setReduceMotion(true);
    controller.move(() => camera.fitWorld());
    expect(camera.center).toEqual([500, 250]);
    frame();
    expect(pending.size).toBe(0);
  });

  test('stopping flat gestures publishes a final pending camera change', () => {
    const camera = new FlatCamera();
    const draw = mock();
    const controller = new FlatController(camera, draw);
    controller.resize(390, 844);
    controller.setActive(true);
    frame();
    controller.drag(40, 0);
    controller.stop();
    expect(pending.size).toBe(1);
    frame();
    expect(draw).toHaveBeenCalledTimes(2);
    expect(pending.size).toBe(0);
  });

  test('globe initial focus survives renderer attachment and animated focus ends at its destination', () => {
    const controller = new GlobeController(mock());
    controller.resize(390, 844);
    controller.setActive(true);
    controller.setReduceMotion(false);
    controller.move(() => controller.camera.focus([140, 30], 0.1));
    const target = Array.from(controller.camera.rotation);
    controller.attach({ draw: mock(), setColors: mock(), dispose: mock() });
    frame();
    expect(Array.from(controller.camera.rotation)).toEqual(target);
    controller.move(() => controller.camera.focus([-105, 55], 0.3));
    expect(Array.from(controller.camera.rotation)).toEqual(target);
    for (let i = 0; i < 40; i++) frame();
    expect(controller.camera.geographicPoint(195, 422)![0]).toBeCloseTo(
      -105,
      3,
    );
    expect(controller.camera.geographicPoint(195, 422)![1]).toBeCloseTo(55, 3);
    expect(pending.size).toBe(0);
    controller.move(() => controller.camera.focus([0, 0], 0.3));
    controller.stop();
    const interrupted = Array.from(controller.camera.rotation);
    frame();
    expect(Array.from(controller.camera.rotation)).toEqual(interrupted);
    expect(pending.size).toBe(0);
  });
});
