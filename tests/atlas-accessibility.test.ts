import { describe, expect, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { FlatController } from '../src/atlas/FlatController';
import { mapAccessibility } from '../src/atlas/mapAccessibility';
import { GlobeCamera } from '../src/globe/camera';
import { GlobeController } from '../src/globe/controller';

function actions(controller: FlatController | GlobeController) {
  const props = mapAccessibility(controller, 'Map');
  return {
    props,
    perform(actionName: string) {
      const handler = props.onAccessibilityAction!;
      handler({ nativeEvent: { actionName } } as Parameters<typeof handler>[0]);
    },
  };
}

describe('map accessibility actions', () => {
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
    expect(moved).not.toEqual(center);
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
    for (let index = 0; index < 40; index++) perform('decrement');
    expect(camera.zoom).toBe(1);
    for (let index = 0; index < 40; index++) perform('left');
    expect(camera.center.every(Number.isFinite)).toBe(true);
  });
});
