import { Gesture } from 'react-native-gesture-handler';

/** Only deliberate upward swipes should open details; taps use the native button. */
export function countryDetailsGesture(
  onOpen: (() => void) | undefined,
  guard: () => () => boolean,
) {
  let isCurrent = () => false;
  let multiTouch = false;
  return Gesture.Pan()
    .enabled(!!onOpen)
    .runOnJS(true)
    .maxPointers(1)
    .activeOffsetY(-12)
    .failOffsetY(12)
    .failOffsetX([-24, 24])
    .onBegin((event) => {
      isCurrent = guard();
      multiTouch = event.numberOfPointers > 1;
    })
    .onTouchesDown((event) => {
      if (event.numberOfTouches > 1) multiTouch = true;
    })
    .onEnd((event, success) => {
      if (
        success &&
        !multiTouch &&
        event.translationY <= -36 &&
        Math.abs(event.translationX) < -event.translationY &&
        isCurrent()
      )
        onOpen?.();
    });
}
