import { describe, expect, mock, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { FlatController } from '../src/atlas/FlatController';
import { GlobeController } from '../src/globe/controller';
import { mockAnimationFrames } from './helpers/animation-frames';

describe('atlas camera transitions', () => {
  const frames = mockAnimationFrames();

  test('flat momentum has no first-frame pause and matches 60 Hz and 120 Hz travel', () => {
    const positions: number[][] = [];
    for (const rate of [60, 120]) {
      const camera = new FlatCamera();
      camera.resize(390, 844);
      camera.zoom = 8;
      camera.center = [500, 250];
      const draw = mock();
      const controller = new FlatController(camera, draw);
      controller.setActive(true);
      controller.setReduceMotion(false);
      frames.advance();
      controller.coast(900, 0);
      frames.advance(1, 1000 / rate);
      expect(camera.center[0]).toBeLessThan(500);
      expect(draw).toHaveBeenLastCalledWith(true);
      frames.advance(rate / 2 - 1, 1000 / rate);
      positions.push([...camera.center]);
      controller.setActive(false);
      expect(frames.pendingCount).toBe(0);
    }
    expect(positions[0][0]).toBeCloseTo(positions[1][0], 6);
    expect(positions[0][1]).toBe(positions[1][1]);
  });

  test('flat momentum stops at edges, on touch, and with Reduce Motion', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    camera.zoom = 8;
    const draw = mock();
    const controller = new FlatController(camera, draw);
    controller.setActive(true);
    controller.setReduceMotion(false);
    camera.drag(1e6, 0);
    const edge = [...camera.center];
    controller.coast(1600, 0);
    frames.advance();
    expect(camera.center).toEqual(edge);
    expect(frames.pendingCount).toBe(0);
    expect(draw).toHaveBeenLastCalledWith(false);

    controller.coast(-900, 0);
    frames.advance(3);
    controller.beginInteraction();
    const stopped = [...camera.center];
    frames.advance(5);
    expect(camera.center).toEqual(stopped);
    expect(draw).toHaveBeenLastCalledWith(true);
    controller.endInteraction();
    frames.advance();
    expect(draw).toHaveBeenLastCalledWith(false);
    expect(frames.pendingCount).toBe(0);

    controller.setReduceMotion(true);
    controller.coast(-900, 0);
    frames.advance(10);
    expect(camera.center).toEqual(stopped);
    expect(frames.pendingCount).toBe(0);
  });

  test('camera frames stay in motion until touch and momentum finish', () => {
    const camera = new FlatCamera();
    const draw = mock();
    const controller = new FlatController(camera, draw);
    controller.resize(390, 844);
    camera.zoom = 8;
    controller.setActive(true);
    controller.setReduceMotion(false);
    frames.advance();
    draw.mockClear();
    controller.beginInteraction();
    for (let index = 0; index < 10; index++) {
      controller.drag(2, 1);
      frames.advance();
    }
    expect(draw.mock.calls.every(([moving]) => moving)).toBe(true);
    controller.coast(500, 0);
    controller.endInteraction();
    frames.advance();
    expect(draw).toHaveBeenLastCalledWith(true);
    frames.advance(180);
    expect(draw.mock.calls.filter(([moving]) => !moving)).toHaveLength(1);
    expect(frames.pendingCount).toBe(0);
  });

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
    controller.resize(390, 760);
    const position = [...camera.center];
    const zoom = camera.zoom;
    frames.advance(40);
    expect(camera.center).toEqual(position);
    expect(camera.zoom).toBe(zoom);
    expect(frames.pendingCount).toBe(0);
    camera.resize(390, 760);
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
