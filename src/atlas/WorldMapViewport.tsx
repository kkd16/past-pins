import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { t } from '../localization';
import {
  AtlasAnnotations,
  type AtlasAnnotationsHandle,
} from './AtlasAnnotations';
import type { FlatCamera } from './FlatCamera';
import { FlatController } from './FlatController';
import { FlatSurface, type FlatSurfaceHandle } from './FlatSurface';
import { navigationGestures } from './gestures';
import { mapAccessibility } from './mapAccessibility';
import { pickFlatCountry } from './picking';
import type { AtlasViewportProps } from './types';
import { useViewportLifecycle } from './useViewportLifecycle';

export function WorldMapViewport({
  camera,
  active,
  command,
  onCommandApplied,
  ...props
}: AtlasViewportProps & { camera: FlatCamera }) {
  const [, update] = useState(0);
  const surface = useRef<FlatSurfaceHandle>(null);
  const annotations = useRef<AtlasAnnotationsHandle>(null);
  const [sized, setSized] = useState(false);
  const [controller] = useState(() => new FlatController(camera));
  useLayoutEffect(() => {
    controller.setFrameHandler((moving) => {
      surface.current?.draw();
      annotations.current?.draw();
      if (!moving) update((value) => value + 1);
    });
    return () => controller.setFrameHandler(() => undefined);
  }, [controller]);
  useViewportLifecycle(controller, active);
  useEffect(() => {
    if (!active || !sized || !command) return;
    controller.move(() => {
      if (command.type === 'focus') camera.focus(command.id);
      else if (command.type === 'location') camera.focusLocation(command.point);
      else camera.fitWorld();
    });
    onCommandApplied(command.key);
  }, [active, camera, command, controller, sized, onCommandApplied]);
  const { onSelect } = props;
  const gesture = useMemo(
    () =>
      navigationGestures(controller, (x, y) =>
        onSelect(
          pickFlatCountry(camera, x, y),
          camera.geographicPoint(x, y) ?? undefined,
        ),
      ),
    [camera, controller, onSelect],
  );
  const accessibility = useMemo(
    () => mapAccessibility(controller, t('atlas.worldMap'), camera.zoom),
    [controller, camera.zoom],
  );
  const project = useCallback(
    (point: readonly number[]) => camera.project(point),
    [camera],
  );
  return (
    <View
      style={styles.fill}
      onLayout={({ nativeEvent: { layout } }) => {
        controller.resize(layout.width, layout.height);
        camera.start(props.homeCountryId);
        setSized(layout.width > 0 && layout.height > 0);
        update((value) => value + 1);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View {...accessibility} style={styles.fill} collapsable={false}>
          <FlatSurface
            ref={surface}
            camera={camera}
            places={props.places}
            selectedId={props.selectedId}
          />
        </View>
      </GestureDetector>
      <AtlasAnnotations
        ref={annotations}
        {...props}
        width={camera.width}
        height={camera.height}
        camera={camera}
        project={project}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, overflow: 'hidden' } });
