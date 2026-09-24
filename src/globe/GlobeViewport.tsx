import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import {
  AtlasAnnotations,
  type AtlasAnnotationsHandle,
} from '../atlas/AtlasAnnotations';
import { countryAnchors } from '../atlas/geography';
import { navigationGestures } from '../atlas/gestures';
import { mapAccessibility } from '../atlas/mapAccessibility';
import type { AtlasViewportProps } from '../atlas/types';
import { useViewportLifecycle } from '../atlas/useViewportLifecycle';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { t } from '../localization';
import { theme } from '../theme';
import type { GlobeCamera } from './camera';
import { GlobeController } from './controller';
import { toCartesian } from './coordinates';
import { GlobeSurface } from './GlobeSurface';
import { pickCountry } from './picking';

export function GlobeViewport({
  camera,
  active,
  command,
  onCommandApplied,
  ...props
}: AtlasViewportProps & { camera: GlobeCamera }) {
  const [failed, setFailed] = useState(false);
  const annotations = useRef<AtlasAnnotationsHandle>(null);
  const [, update] = useState(0);
  const [sized, setSized] = useState(false);
  const fail = useCallback((error: unknown) => {
    console.warn('Globe rendering failed', error);
    setFailed(true);
  }, []);
  const [controller] = useState(() => new GlobeController(fail, camera));
  useLayoutEffect(() => {
    controller.setFrameHandler((moving) => {
      annotations.current?.draw();
      if (!moving) update((value) => value + 1);
    });
    return () => controller.setFrameHandler(() => undefined);
  }, [controller]);
  useViewportLifecycle(controller, active);
  useEffect(
    () => controller.setColors(props.places, props.selectedId),
    [controller, props.places, props.selectedId],
  );
  useEffect(() => {
    if (!active || !sized || !command) return;
    if (command.type === 'focus') {
      const country = countryAnchors.get(command.id);
      if (country)
        controller.move(() =>
          camera.focus(country.anchor, country.angularRadius),
        );
    } else if (command.type === 'location') {
      controller.move(() => camera.focus(command.point, 0.1));
    } else if (command.type === 'north') controller.northUp();
    else controller.reset();
    onCommandApplied(command.key);
  }, [active, camera, command, controller, sized, onCommandApplied]);
  const { onSelect } = props;
  const gesture = useMemo(
    () =>
      navigationGestures(controller, (x, y) => {
        if (controller.ready)
          onSelect(
            pickCountry(camera, x, y),
            camera.geographicPoint(x, y) ?? undefined,
          );
      }),
    [camera, controller, onSelect],
  );
  const accessibility = useMemo(
    () => mapAccessibility(controller, t('atlas.globe'), camera.zoom),
    [controller, camera.zoom],
  );
  const project = useCallback(
    (point: readonly number[]) => camera.project(toCartesian(point)),
    [camera],
  );
  return (
    <View
      style={styles.fill}
      onLayout={({ nativeEvent: { layout } }) => {
        controller.resize(layout.width, layout.height);
        setSized(layout.width > 0 && layout.height > 0);
        update((value) => value + 1);
      }}
    >
      {!failed && (
        <GestureDetector gesture={gesture}>
          <View {...accessibility} style={styles.fill} collapsable={false}>
            <GlobeSurface controller={controller} onError={fail} />
          </View>
        </GestureDetector>
      )}
      {failed ? (
        <ScrollView
          style={[
            styles.error,
            { top: props.topInset, bottom: props.bottomInset },
          ]}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.errorContent}
        >
          <AppText variant="heading">{t('atlas.globeError')}</AppText>
          <AppText tone="muted">{t('atlas.globeErrorHint')}</AppText>
          <Button label={t('common.retry')} onPress={() => setFailed(false)} />
        </ScrollView>
      ) : (
        <AtlasAnnotations
          ref={annotations}
          {...props}
          width={camera.width}
          height={camera.height}
          camera={camera}
          project={project}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  error: StyleSheet.absoluteFill,
  errorContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.space.xl,
    gap: theme.space.md,
  },
});
