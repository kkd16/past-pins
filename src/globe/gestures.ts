import { Gesture } from 'react-native-gesture-handler';

import type { GlobeController } from './controller';
import { pickCountry } from './picking';

export function globeGestures(
  controller: GlobeController,
  onSelect: (id: string | null, anchor?: readonly number[]) => void,
) {
  let pinchZoom = 1;
  let focal = { x: 0, y: 0 };
  let pinching = false;
  let twisting = false;
  let multiTouch = false;
  let pointers = 0;
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => {
      controller.stop();
      pointers = event.numberOfPointers;
    })
    .onChange((event) => {
      if (
        pointers === 1 &&
        event.numberOfPointers === 1 &&
        !pinching &&
        !twisting
      )
        controller.drag(event.changeX, event.changeY);
      pointers = event.numberOfPointers;
    })
    .onEnd((event, success) => {
      if (success && pointers === 1 && !pinching && !twisting)
        controller.coast(event.velocityX, event.velocityY);
    });
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((event) => {
      pinching = true;
      controller.stop();
      pinchZoom = controller.camera.zoom;
      focal = { x: event.focalX, y: event.focalY };
    })
    .onUpdate((event) => {
      controller.zoom(
        pinchZoom * event.scale,
        event.focalX,
        event.focalY,
        focal.x,
        focal.y,
      );
      focal = { x: event.focalX, y: event.focalY };
    })
    .onFinalize(() => {
      pinching = false;
    });
  const rotation = Gesture.Rotation()
    .runOnJS(true)
    .onStart(() => {
      twisting = true;
      controller.stop();
    })
    .onChange((event) => controller.twist(event.rotationChange))
    .onFinalize(() => {
      twisting = false;
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onBegin(() => controller.stop())
    .onTouchesDown((event) => {
      if (event.allTouches.length > 1) multiTouch = true;
    })
    .onEnd((event, success) => {
      if (success && !multiTouch && controller.ready)
        onSelect(
          pickCountry(controller.camera, event.x, event.y),
          controller.camera.geographicPoint(event.x, event.y) ?? undefined,
        );
    })
    .onFinalize(() => {
      multiTouch = false;
    });
  return Gesture.Exclusive(Gesture.Simultaneous(pan, pinch, rotation), tap);
}
