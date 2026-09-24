import { Gesture } from 'react-native-gesture-handler';

type NavigationController = {
  camera: { zoom: number };
  beginInteraction: () => void;
  endInteraction: () => void;
  drag: (dx: number, dy: number) => void;
  coast: (x: number, y: number) => void;
  zoom: (
    zoom: number,
    x: number,
    y: number,
    previousX: number,
    previousY: number,
  ) => void;
  twist?: (radians: number, x: number, y: number) => void;
};

type CameraGesture = 'pan' | 'pinch' | 'rotation';

// UIKit reports trackpad transforms with zero direct touches.
const isTransform = (pointers: number) => pointers === 0 || pointers === 2;

export function navigationGestures(
  controller: NavigationController,
  onTap: (x: number, y: number) => void,
) {
  let pointers: number | null = null;
  let multiTouch = false;
  const activeGestures = new Set<CameraGesture>();
  const begin = (gesture: CameraGesture) => {
    if (activeGestures.size === 0) controller.beginInteraction();
    activeGestures.add(gesture);
  };
  const finish = (gesture: CameraGesture) => {
    if (activeGestures.delete(gesture) && activeGestures.size === 0)
      controller.endInteraction();
  };
  let scale = 1;
  let rotation = 0;
  let focal = { x: 0, y: 0 };
  let rebasePinch = false;
  let rebaseRotation = false;
  const touchesChanged = () => {
    rebasePinch = true;
    rebaseRotation = true;
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .enableTrackpadTwoFingerGesture(true)
    .onBegin((event) => {
      multiTouch =
        event.numberOfPointers > 1 ||
        activeGestures.has('pinch') ||
        activeGestures.has('rotation');
      pointers = event.numberOfPointers;
      begin('pan');
    })
    .onTouchesDown((event) => {
      if (event.numberOfTouches > 1) {
        multiTouch = true;
        pointers = null;
      }
    })
    .onTouchesUp(() => {
      pointers = null;
    })
    .onChange((event) => {
      if (
        pointers === event.numberOfPointers &&
        event.numberOfPointers <= 1 &&
        !activeGestures.has('pinch') &&
        !activeGestures.has('rotation')
      )
        controller.drag(event.changeX, event.changeY);
      pointers = event.numberOfPointers;
    })
    .onEnd((event, success) => {
      // A finger lifting out of a pinch is not a fling.
      if (success && !multiTouch)
        controller.coast(event.velocityX, event.velocityY);
    })
    .onFinalize(() => finish('pan'));

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onTouchesDown(touchesChanged)
    .onTouchesUp(touchesChanged)
    .onStart((event) => {
      multiTouch = true;
      begin('pinch');
      scale = event.scale > 0 && Number.isFinite(event.scale) ? event.scale : 1;
      focal = { x: event.focalX, y: event.focalY };
      rebasePinch = false;
    })
    .onUpdate((event) => {
      if (!(event.scale > 0) || !Number.isFinite(event.scale)) return;
      if (!rebasePinch && isTransform(event.numberOfPointers)) {
        // Incremental scale responds immediately when reversing at a zoom limit.
        controller.zoom(
          controller.camera.zoom * (event.scale / scale),
          event.focalX,
          event.focalY,
          focal.x,
          focal.y,
        );
      }
      scale = event.scale;
      focal = { x: event.focalX, y: event.focalY };
      rebasePinch = !isTransform(event.numberOfPointers);
    })
    .onFinalize(() => finish('pinch'));

  const twist = Gesture.Rotation()
    .runOnJS(true)
    .enabled(!!controller.twist)
    .onTouchesDown(touchesChanged)
    .onTouchesUp(touchesChanged)
    .onStart((event) => {
      multiTouch = true;
      begin('rotation');
      rotation = event.rotation;
      rebaseRotation = false;
    })
    .onUpdate((event) => {
      if (!rebaseRotation && isTransform(event.numberOfPointers))
        controller.twist?.(
          event.rotation - rotation,
          event.anchorX,
          event.anchorY,
        );
      rotation = event.rotation;
      rebaseRotation = !isTransform(event.numberOfPointers);
    })
    .onFinalize(() => finish('rotation'));

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => {
      if (success && !multiTouch) onTap(event.x, event.y);
    });

  return Gesture.Exclusive(Gesture.Simultaneous(pan, pinch, twist), tap);
}
