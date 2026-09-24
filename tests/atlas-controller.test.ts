import { describe, expect, mock, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { FlatController } from '../src/atlas/FlatController';
import { GlobeController } from '../src/globe/controller';
import { mockAnimationFrames } from './helpers/animation-frames';

describe('atlas camera transitions', () => {
  const frames = mockAnimationFrames();

  test('flat transitions coalesce changes, settle, and stop when hidden or interrupted', () => {
    const camera = new FlatCamera();
    const draw = mock();
    const controller = new FlatController(camera, draw);
    controller.resize(390, 844);
    expect(frames.pendingCount).toBe(0);
    controller.setActive(true);
    controller.setReduceMotion(false);
    const start = [...camera.center];
    const target = [620, 230];
    controller.move(() => {
      camera.center = [...target];
      camera.zoom = 4;
    });
    expect(camera.center).toEqual(start);
    expect(frames.pendingCount).toBe(1);
    frames.advance(10);
    expect(camera.center).not.toEqual(start);
    expect(camera.center).not.toEqual(target);
    frames.advance(30);
    expect(camera.center).toEqual(target);
    expect(camera.zoom).toBe(4);
    expect(frames.pendingCount).toBe(0);
    controller.move(() => {
      camera.center = [...target];
    });
    frames.advance();
    expect(camera.center).toEqual(target);
    expect(frames.pendingCount).toBe(0);
    controller.move(() => camera.focus('ca'));
    controller.setActive(false);
    expect(frames.pendingCount).toBe(0);
    const before = [...camera.center];
    frames.advance();
    expect(camera.center).toEqual(before);
    controller.setActive(true);
    controller.setReduceMotion(true);
    controller.move(() => camera.fitWorld());
    expect(camera.center).toEqual([500, 250]);
    frames.advance();
    expect(frames.pendingCount).toBe(0);
  });

  test('enabling Reduce Motion finishes flat focus at its destination', () => {
    const camera = new FlatCamera();
    const controller = new FlatController(camera, mock());
    controller.resize(390, 844);
    controller.setActive(true);
    controller.setReduceMotion(false);
    controller.move(() => {
      camera.center = [620, 230];
      camera.zoom = 4;
    });
    frames.advance(10);
    expect(camera.center).not.toEqual([620, 230]);
    controller.setReduceMotion(true);
    expect(camera.center).toEqual([620, 230]);
    expect(camera.zoom).toBe(4);
    frames.advance();
    expect(frames.pendingCount).toBe(0);
  });

  test('stopping flat gestures publishes a final pending camera change', () => {
    const camera = new FlatCamera();
    const draw = mock();
    const controller = new FlatController(camera, draw);
    controller.resize(390, 844);
    controller.setActive(true);
    frames.advance();
    controller.drag(40, 0);
    controller.stop();
    expect(frames.pendingCount).toBe(1);
    frames.advance();
    expect(draw).toHaveBeenCalledTimes(2);
    expect(frames.pendingCount).toBe(0);
  });

  test('resizing interrupts a flat transition before it can restore stale bounds', () => {
    const camera = new FlatCamera();
    const controller = new FlatController(camera, mock());
    controller.resize(390, 844);
    camera.start(null);
    controller.setActive(true);
    controller.setReduceMotion(false);
    controller.move(() => camera.focus('fj'));
    frames.advance();
    controller.resize(844, 390);
    const position = [...camera.center];
    const zoom = camera.zoom;
    frames.advance(40);
    expect(camera.center).toEqual(position);
    expect(camera.zoom).toBe(zoom);
    expect(frames.pendingCount).toBe(0);
    camera.resize(844, 390);
    expect(camera.center).toEqual(position);
  });

  test('globe initial focus survives renderer attachment and animated focus ends at its destination', () => {
    const controller = new GlobeController(mock());
    controller.resize(390, 844);
    controller.setActive(true);
    controller.setReduceMotion(false);
    controller.move(() => controller.camera.focus([140, 30], 0.1));
    const target = Array.from(controller.camera.rotation);
    controller.attach({ draw: mock(), setColors: mock(), dispose: mock() });
    frames.advance();
    expect(Array.from(controller.camera.rotation)).toEqual(target);
    controller.move(() => controller.camera.focus([-105, 55], 0.3));
    expect(Array.from(controller.camera.rotation)).toEqual(target);
    frames.advance(40);
    expect(controller.camera.geographicPoint(195, 422)![0]).toBeCloseTo(
      -105,
      3,
    );
    expect(controller.camera.geographicPoint(195, 422)![1]).toBeCloseTo(55, 3);
    expect(frames.pendingCount).toBe(0);
    controller.move(() => controller.camera.focus([0, 0], 0.3));
    controller.stop();
    const interrupted = Array.from(controller.camera.rotation);
    frames.advance();
    expect(Array.from(controller.camera.rotation)).toEqual(interrupted);
    expect(frames.pendingCount).toBe(0);
  });
});
