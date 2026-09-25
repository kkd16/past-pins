import {
  flatCountryById,
  mapSize,
  projection,
  countryAnchors,
} from './geography';
import { ProjectedCamera } from './ProjectedCamera';

export class FlatCamera extends ProjectedCamera {
  zoom = 2;
  center: number[] = projection([-20, 15])!;
  initialized = false;

  constructor() {
    super(mapSize, 20, 'center');
  }

  start(home: string | null) {
    if (this.initialized || !this.width || !this.height) return;
    this.initialized = true;
    this.zoom = Math.max(
      2,
      (this.height * 0.8) / (mapSize.height * this.fitScale),
    );
    const anchor = home && countryAnchors.get(home)?.anchor;
    if (anchor) this.center = projection(anchor as [number, number])!;
    this.clamp();
  }

  focus(id: string) {
    const country = flatCountryById.get(id);
    const anchor = countryAnchors.get(id)?.anchor;
    if (!country || !anchor || !this.fitScale) return;
    const [[left, top], [right, bottom]] = country.bounds;
    this.zoom = Math.max(
      2,
      Math.min(
        16,
        Math.min(
          (this.width * 0.65) / Math.max(1, right - left),
          (this.height * 0.5) / Math.max(1, bottom - top),
        ) / this.fitScale,
      ),
    );
    this.center = projection(anchor as [number, number])!;
    this.clamp();
  }

  focusLocation(point: [number, number]) {
    this.zoom = 8;
    this.center = projection(point)!;
    this.clamp();
  }

  project(point: readonly number[]) {
    const projected = projection(point as [number, number]);
    return projected ? this.projectPoint(projected) : null;
  }

  geographicPoint(x: number, y: number) {
    if (!this.scale) return null;
    const point = this.unprojectScreen(x, y);
    const geographic = projection.invert!(point);
    if (!geographic) return null;
    const check = projection(geographic)!;
    return Math.hypot(point[0] - check[0], point[1] - check[1]) < 0.01 &&
      Math.abs(geographic[0]) <= 180 &&
      Math.abs(geographic[1]) <= 90
      ? geographic
      : null;
  }
}
