import { describe, expect, mock, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { FlatController } from '../src/atlas/FlatController';
import { GlobeCamera } from '../src/globe/camera';
import { GlobeController } from '../src/globe/controller';

// Exercise the production callbacks with native event sequences. Recognition
// thresholds and delivery still need verification on iOS.
type Event = Record<string, number>;
type Callback = (event: Event, success?: boolean) => void;
const handlers: Record<string, Record<string, Callback>> = {};
const enabled: Record<string, boolean> = {};
function gesture(name: string) {
  const callbacks: Record<string, Callback> = {};
  handlers[name] = callbacks;
  const builder: object = new Proxy(
    {},
    {
      get: (_, key: string) => (value: Callback | boolean) => {
        if (key.startsWith('on')) callbacks[key] = value as Callback;
        if (key === 'enabled') enabled[name] = value as boolean;
        return builder;
      },
    },
  );
  return builder;
}
mock.module('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => gesture('pan'),
    Pinch: () => gesture('pinch'),
    Rotation: () => gesture('rotation'),
    Tap: () => gesture('tap'),
    Simultaneous: (...gestures: object[]) => gestures,
    Exclusive: (...gestures: object[]) => gestures,
  },
}));
const { navigationGestures } = await import('../src/atlas/gestures');

test('hidden and read-only maps disable every native gesture recognizer', () => {
  const controller = new GlobeController(mock());
  navigationGestures(controller, mock(), false);
  expect(enabled).toEqual({ pan: false, pinch: false, rotation: false, tap: false });
  navigationGestures(controller, mock());
  expect(enabled).toEqual({ pan: true, pinch: true, rotation: true, tap: true });
  navigationGestures(new FlatController(new FlatCamera()), mock());
  expect(enabled.rotation).toBe(false);
});

function setup(mode: 'globe' | 'map') {
  const camera = mode === 'globe' ? new GlobeCamera() : new FlatCamera();
  camera.resize(390, 844);
  const controller =
    camera instanceof GlobeCamera
      ? new GlobeController(mock(), camera)
      : new FlatController(camera);
  const tap = mock();
  const coast = mock();
  controller.coast = coast;
  navigationGestures(controller, tap);
  handlers.pan.onBegin({ numberOfPointers: 1 });
  return { camera, controller, tap, coast };
}

const pinchEvent = (
  scale: number,
  numberOfPointers = 2,
  focalX = 195,
  focalY = 422,
) => ({ scale, numberOfPointers, focalX, focalY });

describe.each(['globe', 'map'] as const)('%s navigation gestures', (mode) => {
  test('overlapping pan and pinch share one interaction lifecycle', () => {
    const { controller } = setup(mode);
    handlers.pan.onFinalize({});
    const begin = mock(controller.beginInteraction.bind(controller));
    const finish = mock(controller.endInteraction.bind(controller));
    controller.beginInteraction = begin;
    controller.endInteraction = finish;
    handlers.pan.onBegin({ numberOfPointers: 1 });
    handlers.pinch.onStart(pinchEvent(1));
    expect(begin).toHaveBeenCalledTimes(1);
    handlers.pan.onFinalize({});
    expect(finish).not.toHaveBeenCalled();
    handlers.pinch.onUpdate(pinchEvent(1.25));
    handlers.pinch.onFinalize({});
    expect(finish).toHaveBeenCalledTimes(1);
    // A recognizer that never activated must not publish another settled frame.
    handlers.rotation.onFinalize({});
    expect(finish).toHaveBeenCalledTimes(1);
  });

  test('a pinch without an accompanying pan still owns the interaction lifecycle', () => {
    const { controller } = setup(mode);
    handlers.pan.onFinalize({});
    const begin = mock(controller.beginInteraction.bind(controller));
    const finish = mock(controller.endInteraction.bind(controller));
    controller.beginInteraction = begin;
    controller.endInteraction = finish;
    handlers.pinch.onStart(pinchEvent(1));
    expect(begin).toHaveBeenCalledTimes(1);
    handlers.pinch.onFinalize({});
    expect(finish).toHaveBeenCalledTimes(1);
  });

  test('pinching reverses immediately after overshooting either zoom limit', () => {
    const { camera } = setup(mode);
    const maximum = mode === 'globe' ? 8 : 20;
    const minimum = mode === 'globe' ? 0.9 : 1;
    handlers.pinch.onStart(pinchEvent(1));
    handlers.pinch.onUpdate(pinchEvent(100));
    handlers.pinch.onUpdate(pinchEvent(200));
    expect(camera.zoom).toBe(maximum);
    handlers.pinch.onUpdate(pinchEvent(180));
    expect(camera.zoom).toBeCloseTo(maximum * 0.9);
    handlers.pinch.onUpdate(pinchEvent(0.001));
    expect(camera.zoom).toBe(minimum);
    handlers.pinch.onUpdate(pinchEvent(0.0011));
    expect(camera.zoom).toBeCloseTo(minimum * 1.1);
  });

  test('adding and lifting fingers rebases the focal point without a camera jump', () => {
    const { camera } = setup(mode);
    camera.zoom = 4;
    handlers.pinch.onStart(pinchEvent(1));
    handlers.pinch.onUpdate(pinchEvent(1.1));
    const center = camera.geographicPoint(195, 422)!;
    const zoom = camera.zoom;
    handlers.pinch.onTouchesDown({ numberOfTouches: 3 });
    handlers.pinch.onUpdate(pinchEvent(2, 3, 50, 100));
    handlers.pinch.onTouchesUp({ numberOfTouches: 2 });
    handlers.pinch.onUpdate(pinchEvent(2, 2, 240, 460));
    expect(camera.zoom).toBe(zoom);
    expect(camera.geographicPoint(195, 422)).toEqual(center);
    handlers.pinch.onUpdate(pinchEvent(2.2, 2, 240, 460));
    expect(camera.zoom).toBeCloseTo(zoom * 1.1);
  });

  test('a pinch can hand back to one-finger panning without a fling or selection', () => {
    const { camera, coast, tap } = setup(mode);
    camera.zoom = 4;
    handlers.pan.onTouchesDown({ numberOfTouches: 2 });
    handlers.pinch.onStart(pinchEvent(1));
    handlers.pan.onChange({ numberOfPointers: 2, changeX: 100, changeY: 100 });
    handlers.pinch.onUpdate(pinchEvent(1.1));
    handlers.pinch.onFinalize({});
    const center = camera.geographicPoint(195, 422)!;
    // Ignore the handoff sample, whose centroid changed when a finger lifted.
    handlers.pan.onChange({ numberOfPointers: 1, changeX: 100, changeY: 100 });
    expect(camera.geographicPoint(195, 422)).toEqual(center);
    handlers.pan.onChange({ numberOfPointers: 1, changeX: 10, changeY: 0 });
    expect(camera.geographicPoint(195, 422)).not.toEqual(center);
    handlers.pan.onEnd({ velocityX: 1500, velocityY: 800 }, true);
    handlers.pan.onFinalize({});
    handlers.tap.onEnd({ x: 195, y: 422 }, true);
    expect(coast).not.toHaveBeenCalled();
    expect(tap).not.toHaveBeenCalled();
    handlers.pan.onBegin({ numberOfPointers: 1 });
    handlers.pan.onFinalize({});
    handlers.tap.onEnd({ x: 195, y: 422 }, true);
    expect(tap).toHaveBeenCalledWith(195, 422);
  });

  test('a stationary pinch followed by a pan does not apply the old centroid translation', () => {
    const { camera } = setup(mode);
    camera.zoom = 4;
    handlers.pan.onTouchesDown({ numberOfTouches: 2 });
    handlers.pinch.onStart(pinchEvent(1));
    handlers.pinch.onUpdate(pinchEvent(1.1));
    handlers.pinch.onFinalize({});
    handlers.pan.onTouchesUp({ numberOfTouches: 1 });
    const center = camera.geographicPoint(195, 422);
    handlers.pan.onChange({ numberOfPointers: 1, changeX: 80, changeY: 60 });
    expect(camera.geographicPoint(195, 422)).toEqual(center);
    handlers.pan.onChange({ numberOfPointers: 1, changeX: 10, changeY: 0 });
    expect(camera.geographicPoint(195, 422)).not.toEqual(center);
  });

  test('only a successful one-finger drag starts momentum', () => {
    const { coast } = setup(mode);
    handlers.pan.onEnd({ velocityX: 900, velocityY: 100 }, false);
    expect(coast).not.toHaveBeenCalled();
    handlers.pan.onFinalize({});
    handlers.pan.onBegin({ numberOfPointers: 1 });
    handlers.pan.onEnd({ velocityX: 900, velocityY: 100 }, true);
    expect(coast).toHaveBeenCalledWith(900, 100);
  });

  test('degenerate pinch samples cannot poison the camera', () => {
    const { camera } = setup(mode);
    handlers.pinch.onStart(pinchEvent(1));
    const zoom = camera.zoom;
    for (const scale of [0, NaN, Infinity])
      handlers.pinch.onUpdate(pinchEvent(scale));
    expect(camera.zoom).toBe(zoom);
    handlers.pinch.onUpdate(pinchEvent(1.2));
    expect(camera.zoom).toBeCloseTo(zoom * 1.2);
  });
});

test('rotation passes its moving pivot to the globe and rebases after finger changes', () => {
  const { controller } = setup('globe');
  const twist = mock();
  (controller as GlobeController).twist = twist;
  handlers.rotation.onStart({ rotation: 0, numberOfPointers: 2 });
  handlers.rotation.onUpdate({
    rotation: 0.2,
    numberOfPointers: 2,
    anchorX: 260,
    anchorY: 450,
  });
  expect(twist).toHaveBeenLastCalledWith(0.2, 260, 450);
  handlers.rotation.onTouchesUp({ numberOfTouches: 1 });
  handlers.rotation.onUpdate({
    rotation: 2,
    numberOfPointers: 1,
    anchorX: 20,
    anchorY: 30,
  });
  expect(twist).toHaveBeenCalledTimes(1);
});
