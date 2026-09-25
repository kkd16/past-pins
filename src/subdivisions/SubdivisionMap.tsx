import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { countryColor } from '../atlas/colors';
import { navigationGestures } from '../atlas/gestures';
import { IconButton } from '../components/IconButton';
import type { AppData } from '../data/model';
import { t } from '../localization';
import { theme } from '../theme';
import { getSubdivisionMap } from './geography';
import {
  SubdivisionCamera,
  SubdivisionController,
  needsSubdivisionMarker,
  pickSubdivision,
  subdivisionPickShapes,
} from './map-layout';

type SubdivisionMapProps = {
  countryId: string;
  statuses: AppData['subdivisions'];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

/** The screen's region list supplies the accessible equivalent to map gestures. */
export function SubdivisionMap({
  countryId,
  statuses,
  selectedId,
  onSelect,
  disabled = false,
}: SubdivisionMapProps) {
  const map = getSubdivisionMap(countryId);
  const camera = useMemo(
    () => new SubdivisionCamera(map ?? { width: 1, height: 1 }),
    [map],
  );
  const controller = useMemo(() => new SubdivisionController(camera), [camera]);
  const shapes = useMemo(() => subdivisionPickShapes(map?.regions ?? []), [map]);
  const land = useRef<G<unknown>>(null);
  const marker = useRef<Circle>(null);
  const dots = useRef(new Map<string, Circle>());
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const selected = map?.regions.find(({ id }) => id === selectedId);
  const fitScale = map
    ? Math.min(viewport.width / map.width, viewport.height / map.height)
    : 0;
  const tinyRegions = useMemo(
    () =>
      map?.regions.filter((region) => needsSubdivisionMarker(region, fitScale)) ?? [],
    [map, fitScale],
  );

  // Transform the vectors inside a fixed SVG viewport, keeping close zooms crisp.
  // Native props avoid reconciling every country path on each gesture frame.
  const draw = useCallback(() => {
    if (!camera.scale) return;
    land.current?.setNativeProps({ matrix: camera.matrix });
    marker.current?.setNativeProps({ r: 4 / camera.scale });
    for (const region of tinyRegions) {
      dots.current.get(region.id)?.setNativeProps({
        r: needsSubdivisionMarker(region, camera.scale) ? 3 / camera.scale : 0,
      });
    }
  }, [camera, tinyRegions]);
  useLayoutEffect(() => {
    controller.configure(!disabled, draw);
    return () => controller.configure(false, () => undefined);
  }, [controller, disabled, draw]);
  useLayoutEffect(() => {
    camera.resize(viewport.width, viewport.height);
    if (map) camera.focus(map.focusBounds);
    draw();
  }, [camera, draw, map, viewport]);
  useLayoutEffect(() => {
    if (!selected) return;
    camera.focus(selected.bounds);
    draw();
  }, [camera, draw, selected, viewport]);
  useLayoutEffect(draw);

  const gesture = useMemo(
    () =>
      navigationGestures(controller, (x, y) => {
        if (disabled) return;
        const id = pickSubdivision(camera, shapes, x, y);
        if (id) onSelect(id);
      }),
    [camera, controller, disabled, onSelect, shapes],
  );

  if (!map) return null;
  return (
    <View
      style={styles.map}
      onLayout={({ nativeEvent: { layout } }) => {
        setViewport((previous) =>
          previous.width === layout.width && previous.height === layout.height
            ? previous
            : { width: layout.width, height: layout.height },
        );
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          style={styles.viewport}
          collapsable={false}
          accessible={false}
          accessibilityElementsHidden
        >
          <Svg
            width="100%"
            height="100%"
            accessible={false}
            accessibilityElementsHidden
          >
            <G ref={land}>
              {map.regions.map(({ id, path }) => (
                <Path
                  key={id}
                  d={path}
                  fillRule="evenodd"
                  fill={countryColor(statuses[id], false)}
                  stroke={theme.globe.border}
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {tinyRegions.map(({ id, point }) => (
                <Circle
                  key={id}
                  ref={(node) => {
                    if (node) dots.current.set(id, node);
                    else dots.current.delete(id);
                  }}
                  cx={point[0]}
                  cy={point[1]}
                  r={0}
                  fill={countryColor(statuses[id], false)}
                  stroke={theme.globe.border}
                  strokeWidth={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {selected && (
                <G>
                  <Path
                    d={selected.path}
                    fill="none"
                    stroke={theme.globe.selected}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <Circle
                    ref={marker}
                    cx={selected.point[0]}
                    cy={selected.point[1]}
                    r={0}
                    fill={theme.globe.selected}
                    stroke={theme.globe.border}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </G>
              )}
            </G>
          </Svg>
        </View>
      </GestureDetector>
      <IconButton
        name="reset"
        accessibilityLabel={t('subdivisions.fitCountry')}
        disabled={disabled}
        style={styles.reset}
        onPress={() => {
          camera.fit();
          draw();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: theme.globe.ocean,
    overflow: 'hidden',
  },
  // Geographic content keeps its coordinates when surrounding UI uses RTL.
  viewport: { flex: 1, direction: 'ltr' },
  reset: {
    ...theme.surface.floating,
    position: 'absolute',
    top: theme.space.sm,
    end: theme.space.lg,
    borderRadius: theme.radius.pill,
  },
});
