import { Gesture } from 'react-native-gesture-handler';

import type { FlatController } from './FlatController';
import { pickFlatCountry } from './picking';

export function flatGestures(
  controller: FlatController,
  onSelect: (id: string | null, anchor?: readonly number[]) => void,
) {
  let pointers = 0;
  let pinching = false;
  let multiTouch = false;
  let zoom = 1;
  let focal = { x: 0, y: 0 };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      controller.stop();
      pointers = 0;
    })
    .onChange((event) => {
      if (pointers === 1 && event.numberOfPointers === 1 && !pinching)
        controller.drag(event.changeX, event.changeY);
      pointers = event.numberOfPointers;
    });
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((event) => {
      pinching = true;
      controller.stop();
      zoom = controller.camera.zoom;
      focal = { x: event.focalX, y: event.focalY };
    })
    .onUpdate((event) => {
      controller.zoom(
        zoom * event.scale,
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
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onBegin(() => controller.stop())
    .onTouchesDown((event) => {
      if (event.allTouches.length > 1) multiTouch = true;
    })
    .onEnd((event, success) => {
      if (success && !multiTouch)
        onSelect(
          pickFlatCountry(controller.camera, event.x, event.y),
          controller.camera.geographicPoint(event.x, event.y) ?? undefined,
        );
    })
    .onFinalize(() => {
      multiTouch = false;
    });
  return Gesture.Exclusive(Gesture.Simultaneous(pan, pinch), tap);
}
