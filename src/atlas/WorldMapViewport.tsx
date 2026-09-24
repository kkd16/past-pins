import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { toGeographic } from '../globe/coordinates';
import world from '../globe/world.json';
import { theme } from '../theme';
import { AtlasAnnotations } from './AtlasAnnotations';
import { countryColor } from './colors';
import type { FlatCamera } from './FlatCamera';
import { FlatController } from './FlatController';
import { flatGestures } from './flatGestures';
import { flatCountries, oceanPath, projection } from './geography';
import type { AtlasViewportProps } from './types';
import { useViewportLifecycle } from './useViewportLifecycle';

const FlatLand = memo(function FlatLand({
  places,
  selectedId,
}: Pick<AtlasViewportProps, 'places' | 'selectedId'>) {
  return (
    <>
      {flatCountries.map(({ id, path }) => (
        <Path
          key={id}
          d={path}
          fill={countryColor(places[id], selectedId === id)}
          stroke={theme.globe.border}
          strokeWidth={0.4}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </>
  );
});

const markers = world.markers.map(({ id, position }) => ({
  id,
  point: projection(toGeographic(position as [number, number, number]))!,
}));

export function WorldMapViewport({
  camera,
  ...props
}: AtlasViewportProps & { camera: FlatCamera }) {
  const [, update] = useState(0);
  const [sized, setSized] = useState(false);
  const [controller] = useState(
    () => new FlatController(camera, () => update((value) => value + 1)),
  );
  useViewportLifecycle(controller);
  const { command, onCommandApplied } = props;
  useEffect(() => {
    if (!sized || !command) return;
    controller.move(() =>
      command.type === 'focus' ? camera.focus(command.id) : camera.fitWorld(),
    );
    onCommandApplied(command.key);
  }, [camera, command, controller, sized, onCommandApplied]);
  const gesture = useMemo(
    () => flatGestures(controller, props.onSelect),
    [controller, props.onSelect],
  );
  return (
    <View
      style={styles.fill}
      onLayout={({ nativeEvent: { layout } }) => {
        controller.resize(layout.width, layout.height);
        camera.start(props.homeCountryId);
        setSized(layout.width > 0 && layout.height > 0);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          style={styles.fill}
          collapsable={false}
          accessibilityElementsHidden
        >
          <Svg width="100%" height="100%">
            <G
              transform={`translate(${camera.width / 2} ${camera.height / 2}) scale(${camera.scale || 1}) translate(${-camera.center[0]} ${-camera.center[1]})`}
            >
              <Path d={oceanPath} fill={theme.globe.ocean} />
              <FlatLand places={props.places} selectedId={props.selectedId} />
              {markers.map(({ id, point }) => (
                <Circle
                  key={id}
                  cx={point[0]}
                  cy={point[1]}
                  r={3 / (camera.scale || 1)}
                  fill={countryColor(props.places[id], props.selectedId === id)}
                />
              ))}
            </G>
          </Svg>
        </View>
      </GestureDetector>
      <AtlasAnnotations
        {...props}
        width={camera.width}
        height={camera.height}
        zoom={camera.zoom}
        project={(point) => camera.project(point)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, overflow: 'hidden' } });
