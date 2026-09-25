import { countryAtPoint } from '../countries/geography';
import type { GlobeCamera } from './camera';
import world from './world.json';

export function pickCountry(camera: GlobeCamera, x: number, y: number) {
  const point = camera.geographicPoint(x, y);
  if (!point) return null;
  for (const marker of world.markers) {
    const screen = camera.project(marker.position);
    if (screen && Math.hypot(screen[0] - x, screen[1] - y) <= 10)
      return marker.id;
  }
  return countryAtPoint(point);
}
