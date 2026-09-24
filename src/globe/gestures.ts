import { Gesture } from 'react-native-gesture-handler';

import type { GlobeController } from './controller';
import { pickCountry } from './picking';

export function globeGestures(
  controller: GlobeController,
  onSelect: (id: string) => void,
) {
  let pinchZoom = 1;
  let pinching = false;
  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
    .runOnJS(true)
    .onBegin(() => controller.stop())
    .onChange((event) => {
      if (!pinching) controller.drag(event.changeX, event.changeY);
    })
    .onEnd((event, success) => {
      if (success && !pinching)
        controller.coast(event.velocityX, event.velocityY);
    });
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      pinching = true;
      controller.stop();
      pinchZoom = controller.camera.zoom;
    })
    .onUpdate((event) => controller.zoom(pinchZoom * event.scale))
    .onFinalize(() => {
      pinching = false;
    });
  const tap = Gesture.Tap()
    .maxDistance(4)
    .runOnJS(true)
    .onBegin(() => controller.stop())
    .onTouchesDown((event, manager) => {
      if (event.allTouches.length > 1) manager.fail();
    })
    .onEnd((event, success) => {
      if (!success || !controller.ready) return;
      const id = pickCountry(controller.camera, event.x, event.y);
      if (id) onSelect(id);
    });
  return Gesture.Exclusive(Gesture.Simultaneous(pan, pinch), tap);
}
