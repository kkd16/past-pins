import { describe, expect, mock, test } from 'bun:test';

import { GlobeController } from '../src/globe/controller';
import { mockAnimationFrames } from './helpers/animation-frames';

describe('globe frame lifecycle', () => {
  const frames = mockAnimationFrames();

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
    controller.setColors({ ca: 'visited' });
    expect(frames.pendingCount).toBe(0);
    expect(renderer.setColors).not.toHaveBeenCalled();
    controller.setActive(true);
    controller.drag(10, 10);
    controller.twist(0.5);
    controller.zoom(2);
    controller.stop();
    expect(frames.pendingCount).toBe(1);
    frames.advance();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(renderer.setColors).toHaveBeenCalledTimes(1);
    expect(frames.pendingCount).toBe(0);
    const beforeTwist = Array.from(controller.camera.rotation);
    controller.twist(-0.5);
    expect(Array.from(controller.camera.rotation)).not.toEqual(beforeTwist);
    expect(frames.pendingCount).toBe(1);
    frames.advance();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(frames.pendingCount).toBe(0);
    controller.drag(10, 0);
    controller.setActive(false);
    controller.setColors({ fr: 'visited' });
    frames.advance();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(renderer.setColors).toHaveBeenCalledTimes(1);
    const orientation = Array.from(controller.camera.rotation);
    controller.setActive(true);
    frames.advance();
    expect(Array.from(controller.camera.rotation)).toEqual(orientation);
    expect(renderer.setColors).toHaveBeenLastCalledWith(
      { fr: 'visited' },
      null,
    );
  });

  test('inertia settles; Reduce Motion and leaving the tab stop it', () => {
    const { controller } = setup();
    controller.setActive(true);
    controller.setReduceMotion(false);
    const initial = Array.from(controller.camera.rotation);
    controller.coast(900, 500);
    frames.advance(2);
    expect(Array.from(controller.camera.rotation)).not.toEqual(initial);
    expect(frames.pendingCount).toBe(1);
    frames.advance(178);
    expect(frames.pendingCount).toBe(0);
    const settled = Array.from(controller.camera.rotation);
    frames.advance(10);
    expect(Array.from(controller.camera.rotation)).toEqual(settled);
    controller.coast(900, 500);
    frames.advance();
    controller.setReduceMotion(true);
    frames.advance();
    expect(frames.pendingCount).toBe(0);
    const rotation = Array.from(controller.camera.rotation);
    controller.coast(900, 500);
    frames.advance();
    expect(Array.from(controller.camera.rotation)).toEqual(rotation);
    controller.setReduceMotion(false);
    controller.coast(900, 500);
    controller.setActive(false);
    expect(frames.pendingCount).toBe(0);
  });

  test('enabling Reduce Motion finishes globe focus at its destination', () => {
    const { controller } = setup();
    controller.setActive(true);
    controller.setReduceMotion(false);
    controller.move(() => controller.camera.focus([-105, 55], 0.01));
    frames.advance(10);
    expect(controller.camera.zoom).toBeLessThan(8);
    controller.setReduceMotion(true);
    const center = controller.camera.geographicPoint(195, 422)!;
    expect(center[0]).toBeCloseTo(-105, 3);
    expect(center[1]).toBeCloseTo(55, 3);
    expect(controller.camera.zoom).toBe(8);
    frames.advance();
    expect(frames.pendingCount).toBe(0);
  });

  test('resetting an unchanged globe does not start an animation loop', () => {
    const { controller, renderer } = setup();
    controller.setActive(true);
    controller.setReduceMotion(false);
    frames.advance();
    controller.reset();
    frames.advance();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(frames.pendingCount).toBe(0);
    controller.northUp();
    frames.advance();
    expect(frames.pendingCount).toBe(0);
  });

  test('releases resources, reports rendering failure once, and allows a fresh renderer', () => {
    const { controller, renderer, error } = setup();
    renderer.draw.mockImplementation(() => {
      throw new Error('Lost graphics context');
    });
    controller.setActive(true);
    frames.advance();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(controller.ready).toBe(false);
    expect(frames.pendingCount).toBe(0);
    const replacement = { draw: mock(), setColors: mock(), dispose: mock() };
    controller.attach(replacement);
    frames.advance();
    expect(replacement.draw).toHaveBeenCalledTimes(1);
    controller.detach();
    expect(replacement.dispose).toHaveBeenCalledTimes(1);
    expect(frames.pendingCount).toBe(0);
  });
});
