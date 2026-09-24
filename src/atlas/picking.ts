import { geoContains } from 'd3-geo';

import { countryFeatures } from '../countries/geography';
import world from '../globe/world.json';
import { toGeographic } from '../globe/coordinates';

export function pickFlatCountry(
  camera: {
    geographicPoint: (x: number, y: number) => [number, number] | null;
    project: (point: readonly number[]) => number[] | null;
  },
  x: number,
  y: number,
) {
  for (const marker of world.markers) {
    const screen = camera.project(
      toGeographic(marker.position as [number, number, number]),
    );
    if (screen && Math.hypot(screen[0] - x, screen[1] - y) <= 10)
      return marker.id;
  }
  const point = camera.geographicPoint(x, y);
  return point
    ? (countryFeatures
        .find((shape) => geoContains(shape, point))
        ?.properties.iso_a2.toLowerCase() ?? null)
    : null;
}
