import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G } from 'react-native-svg';

import { countryColor } from '../atlas/colors';
import { FlatController } from '../atlas/FlatController';
import { navigationGestures } from '../atlas/gestures';
import { MapMarker, MapPath, MapPaths } from '../atlas/MapShapes';
import { useViewportLifecycle } from '../atlas/useViewportLifecycle';
import { IconButton } from '../components/IconButton';
import type { AppData } from '../data/model';
import { t } from '../localization';
import { theme } from '../theme';
import { getSubdivisionMap } from './geography';
import {
  SubdivisionCamera,
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
  active?: boolean;
  focusRequest?: number;
};

/** The screen's region list supplies the accessible equivalent to map gestures. */
export function SubdivisionMap({
  countryId,
  statuses,
  selectedId,
  onSelect,
  disabled = false,
  active = true,
  focusRequest = 0,
}: SubdivisionMapProps) {
  const map = getSubdivisionMap(countryId);
  const camera = useMemo(
    () => new SubdivisionCamera(map ?? { width: 1, height: 1 }),
    [map],
  );
  const controller = useMemo(() => new FlatController(camera), [camera]);
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
    controller.setFrameHandler(draw);
    return () => controller.setFrameHandler(() => undefined);
  }, [controller, draw]);
  useViewportLifecycle(controller, active && !disabled);
  useLayoutEffect(() => {
    controller.resize(viewport.width, viewport.height);
    camera.start();
  }, [camera, controller, viewport]);
  useLayoutEffect(() => {
    // View toggles preserve pan and zoom; explicit selections and layout changes
    // reframe the region in the usable area, even while the map is hidden.
    if (selected && camera.scale)
      controller.move(() => camera.focus(selected.bounds));
  }, [camera, controller, focusRequest, selected, viewport]);
  useLayoutEffect(draw);

  const gesture = useMemo(
    () =>
      navigationGestures(
        controller,
        (x, y) => {
          const id = pickSubdivision(camera, shapes, x, y);
          if (id) onSelect(id);
        },
        active && !disabled,
      ),
    [active, camera, controller, disabled, onSelect, shapes],
  );

  if (!map) return null;
  return (
    <View
      style={styles.map}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width <= 0 || layout.height <= 0) return;
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
              <MapPaths
                shapes={map.regions}
                fillRule="evenodd"
                strokeWidth={0.7}
                appearance={(id) => ({ fill: countryColor(statuses[id], false) })}
              />
              {tinyRegions.map(({ id, point }) => (
                <MapMarker
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
                />
              ))}
              {selected && (
                <G>
                  <MapPath
                    d={selected.path}
                    fill="none"
                    stroke={theme.globe.selected}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                  <MapMarker
                    ref={marker}
                    cx={selected.point[0]}
                    cy={selected.point[1]}
                    r={0}
                    fill={theme.globe.selected}
                    stroke={theme.globe.border}
                    strokeWidth={1.5}
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
        onPress={() => controller.move(() => camera.fit())}
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
