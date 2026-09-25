import { geoContains } from 'd3-geo';

import { countryFeatures } from '../countries/geography';
import type { FlatCamera } from './FlatCamera';
import { flatMarkers } from './geography';

export function pickFlatCountry(
  camera: Pick<FlatCamera, 'geographicPoint' | 'projectPoint'>,
  x: number,
  y: number,
) {
  for (const marker of flatMarkers) {
    const screen = camera.projectPoint(marker.point);
    if (Math.hypot(screen[0] - x, screen[1] - y) <= 10)
      return marker.id;
  }
  const point = camera.geographicPoint(x, y);
  return point
    ? (countryFeatures
        .find((shape) => geoContains(shape, point))
        ?.properties.iso_a2.toLowerCase() ?? null)
    : null;
}
