import {
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { theme } from '../theme';
import { countryColor } from './colors';
import type { FlatCamera } from './FlatCamera';
import { flatCountries, flatMarkers, oceanPath } from './geography';
import { MapMarker, MapPaths } from './MapShapes';
import type { AtlasViewportProps } from './types';

export type FlatSurfaceHandle = { draw: () => void };

export const FlatSurface = memo(function FlatSurface({
  ref,
  camera,
  places,
  selectedId,
}: Pick<AtlasViewportProps, 'places' | 'selectedId'> & {
  ref: Ref<FlatSurfaceHandle>;
  camera: FlatCamera;
}) {
  const land = useRef<G<unknown>>(null);
  const points = useRef(new Map<string, Circle>());
  const draw = () => {
    if (!camera.scale) return;
    land.current?.setNativeProps({ matrix: camera.matrix });
    for (const { id, point } of flatMarkers) {
      const [cx, cy] = camera.projectPoint(point);
      points.current.get(id)?.setNativeProps({ cx, cy });
    }
  };
  useImperativeHandle(ref, () => ({ draw }));
  useLayoutEffect(draw);

  return (
    <Svg
      width="100%"
      height="100%"
      accessible={false}
      accessibilityElementsHidden
    >
      <G ref={land}>
        <Path d={oceanPath} fill={theme.globe.ocean} />
        <MapPaths
          shapes={flatCountries}
          appearance={(id) => ({
            fill: countryColor(places[id], selectedId === id),
          })}
        />
      </G>
      {flatMarkers.map(({ id }) => (
        <MapMarker
          key={id}
          ref={(circle) => {
            if (circle) points.current.set(id, circle);
            else points.current.delete(id);
          }}
          r={3}
          fill={countryColor(places[id], selectedId === id)}
        />
      ))}
    </Svg>
  );
});
