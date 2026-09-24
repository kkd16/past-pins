import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { AtlasAnnotations } from '../atlas/AtlasAnnotations';
import { countryAnchors } from '../atlas/geography';
import type { AtlasViewportProps } from '../atlas/types';
import { useViewportLifecycle } from '../atlas/useViewportLifecycle';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { theme } from '../theme';
import type { GlobeCamera } from './camera';
import { GlobeController } from './controller';
import { toCartesian } from './coordinates';
import { globeGestures } from './gestures';
import { GlobeSurface } from './GlobeSurface';

export function GlobeViewport({
  camera,
  ...props
}: AtlasViewportProps & { camera: GlobeCamera }) {
  const [failed, setFailed] = useState(false);
  const [, update] = useState(0);
  const [sized, setSized] = useState(false);
  const fail = useCallback((error: unknown) => {
    console.warn('Globe rendering failed', error);
    setFailed(true);
  }, []);
  const [controller] = useState(
    () => new GlobeController(fail, camera, () => update((value) => value + 1)),
  );
  useViewportLifecycle(controller);
  useEffect(
    () => controller.setColors(props.places, props.selectedId),
    [controller, props.places, props.selectedId],
  );
  const { command, onCommandApplied } = props;
  useEffect(() => {
    if (!sized || !command) return;
    if (command.type === 'focus') {
      const country = countryAnchors.get(command.id);
      if (country)
        controller.move(() =>
          camera.focus(country.anchor, country.angularRadius),
        );
    } else if (command.type === 'north') controller.northUp();
    else controller.reset();
    onCommandApplied(command.key);
  }, [camera, command, controller, sized, onCommandApplied]);
  const gesture = useMemo(
    () => globeGestures(controller, props.onSelect),
    [controller, props.onSelect],
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
          <View
            style={styles.fill}
            collapsable={false}
            accessibilityElementsHidden
          >
            <GlobeSurface controller={controller} onError={fail} />
          </View>
        </GestureDetector>
      )}
      {failed ? (
        <View style={styles.error}>
          <AppText variant="heading">The globe couldn’t load.</AppText>
          <AppText tone="muted">
            Try the world map, or browse your places in Countries.
          </AppText>
          <Button label="Try again" onPress={() => setFailed(false)} />
        </View>
      ) : (
        <AtlasAnnotations
          {...props}
          width={camera.width}
          height={camera.height}
          zoom={camera.zoom}
          project={(point) => camera.project(toCartesian(point))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  error: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    padding: theme.space.xl,
    gap: theme.space.md,
  },
});
