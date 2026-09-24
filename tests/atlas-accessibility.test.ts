import { describe, expect, mock, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { FlatController } from '../src/atlas/FlatController';
import { mapAccessibility } from '../src/atlas/mapAccessibility';
import { GlobeCamera } from '../src/globe/camera';
import { GlobeController } from '../src/globe/controller';

function actions(controller: Parameters<typeof mapAccessibility>[0]) {
  const props = mapAccessibility(controller, 'Map', controller.camera.zoom);
  return {
    props,
    perform(actionName: string) {
      const handler = props.onAccessibilityAction!;
      handler({ nativeEvent: { actionName } } as Parameters<typeof handler>[0]);
    },
  };
}

describe('map accessibility actions', () => {
  test('cached actions use current camera dimensions and zoom', () => {
    const controller = {
      camera: { width: 390, height: 844, zoom: 1.2 },
      stop: mock(),
      drag: mock(),
      zoom: mock(),
    };
    const { perform } = actions(controller);
    Object.assign(controller.camera, { width: 1000, height: 600, zoom: 4 });
    perform('increment');
    expect(controller.zoom).toHaveBeenCalledWith(5, 500, 300, 500, 300);
    perform('left');
    expect(controller.drag).toHaveBeenCalledWith(-150, 0);
  });

  test('globe actions zoom and pan without touch gestures and respect camera bounds', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    const controller = new GlobeController(() => undefined, camera);
    const { props, perform } = actions(controller);
    expect(props.accessibilityRole).toBe('adjustable');
    const start = camera.zoom;
    perform('increment');
    expect(camera.zoom).toBeGreaterThan(start);
    perform('decrement');
    expect(camera.zoom).toBeCloseTo(start);
    const center = camera.geographicPoint(195, 422)!;
    perform('left');
    const moved = camera.geographicPoint(195, 422)!;
    expect(moved[0]).toBeGreaterThan(center[0]);
    expect(moved[1]).toBeCloseTo(center[1], 4);
    perform('right');
    expect(camera.geographicPoint(195, 422)![0]).toBeCloseTo(center[0], 4);
    for (let index = 0; index < 40; index++) perform('increment');
    expect(camera.zoom).toBe(8);
    for (let index = 0; index < 40; index++) perform('decrement');
    expect(camera.zoom).toBe(0.9);
  });

  test('world map exposes the same actions with bounded panning and zoom', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    camera.focus('fr');
    const controller = new FlatController(camera, () => undefined);
    const { props, perform } = actions(controller);
    expect(props.accessibilityActions?.map(({ name }) => name)).toEqual([
      'increment',
      'decrement',
      'left',
      'right',
      'up',
      'down',
    ]);
    const before = camera.center[1];
    perform('up');
    expect(camera.center[1]).toBeGreaterThan(before);
    perform('down');
    expect(camera.center[1]).toBeCloseTo(before);
    for (let index = 0; index < 40; index++) perform('increment');
    expect(camera.zoom).toBe(20);
    for (let index = 0; index < 40; index++) perform('left');
    expect(camera.center[0]).toBe(975);
    for (let index = 0; index < 40; index++) perform('decrement');
    expect(camera.zoom).toBe(1);
    for (let index = 0; index < 40; index++) perform('left');
    expect(camera.center).toEqual([500, 250]);
  });
});
