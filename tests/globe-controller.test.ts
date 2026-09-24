import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { GlobeController } from '../src/globe/controller';

describe('globe frame lifecycle', () => {
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

  function setup() {
    const error = mock();
    const renderer = { draw: mock(), setColors: mock(), dispose: mock() };
    const controller = new GlobeController(error);
    controller.resize(390, 844);
    controller.attach(renderer);
    return { controller, renderer, error };
  }

  test('renders on demand, coalesces changes, and does no GPU work while hidden', () => {
    const { controller, renderer } = setup();
    controller.setColors(new Set(['ca']), null);
    expect(pending.size).toBe(0);
    expect(renderer.setColors).not.toHaveBeenCalled();
    controller.setActive(true);
    controller.drag(10, 10);
    controller.zoom(2);
    expect(pending.size).toBe(1);
    frame();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(renderer.setColors).toHaveBeenCalledTimes(1);
    expect(pending.size).toBe(0);
    controller.drag(10, 0);
    controller.setActive(false);
    controller.setColors(new Set(['fr']), 'fr');
    frame();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(renderer.setColors).toHaveBeenCalledTimes(1);
    const orientation = Array.from(controller.camera.rotation);
    controller.setActive(true);
    frame();
    expect(Array.from(controller.camera.rotation)).toEqual(orientation);
    expect(renderer.setColors).toHaveBeenLastCalledWith(new Set(['fr']), 'fr');
  });

  test('inertia settles; Reduce Motion and leaving the tab stop it', () => {
    const { controller } = setup();
    controller.setActive(true);
    controller.setReduceMotion(false);
    controller.coast(900, 500);
    for (let i = 0; i < 180; i++) frame();
    expect(pending.size).toBe(0);
    controller.coast(900, 500);
    frame();
    controller.setReduceMotion(true);
    frame();
    expect(pending.size).toBe(0);
    const rotation = Array.from(controller.camera.rotation);
    controller.coast(900, 500);
    frame();
    expect(Array.from(controller.camera.rotation)).toEqual(rotation);
    controller.setReduceMotion(false);
    controller.coast(900, 500);
    controller.setActive(false);
    expect(pending.size).toBe(0);
  });

  test('releases resources, reports rendering failure once, and allows a fresh renderer', () => {
    const { controller, renderer, error } = setup();
    renderer.draw.mockImplementation(() => {
      throw new Error('Lost graphics context');
    });
    controller.setActive(true);
    frame();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(controller.ready).toBe(false);
    expect(pending.size).toBe(0);
    const replacement = { draw: mock(), setColors: mock(), dispose: mock() };
    controller.attach(replacement);
    frame();
    expect(replacement.draw).toHaveBeenCalledTimes(1);
    controller.detach();
    expect(replacement.dispose).toHaveBeenCalledTimes(1);
    expect(pending.size).toBe(0);
  });
});
