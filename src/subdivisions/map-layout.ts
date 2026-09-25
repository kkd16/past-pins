import { ProjectedCamera } from '../atlas/ProjectedCamera';
import type { SubdivisionMapRegion } from './types';

type Bounds = readonly (readonly number[])[];
type MapSize = { width: number; height: number; focusBounds?: Bounds };

export const subdivisionMapMaxZoom = 60;

export class SubdivisionCamera extends ProjectedCamera {
  initialized = false;

  constructor(readonly map: MapSize) {
    super(map, subdivisionMapMaxZoom);
  }

  start() {
    if (this.initialized || !this.scale) return;
    this.initialized = true;
    if (this.map.focusBounds) this.focus(this.map.focusBounds);
  }

  focus(bounds: Bounds) {
    if (!this.fitScale) return;
    const [[left, top], [right, bottom]] = bounds;
    // Frame the region with padding, then keep the camera inside the map.
    this.zoom = Math.max(
      1,
      Math.min(
        subdivisionMapMaxZoom,
        (this.width * 0.72) / Math.max((right - left) * this.fitScale, 0.01),
        (this.height * 0.72) / Math.max((bottom - top) * this.fitScale, 0.01),
      ),
    );
    this.center = [(left + right) / 2, (top + bottom) / 2];
    this.clamp();
  }
}

export function needsSubdivisionMarker(
  region: SubdivisionMapRegion,
  scale: number,
) {
  const [[left, top], [right, bottom]] = region.bounds;
  return Math.max(right - left, bottom - top) * scale < 8;
}

/** Generated paths contain only absolute M/L/Z commands. Decode one country. */
export function subdivisionPickShapes(
  regions: readonly SubdivisionMapRegion[],
) {
  return regions.map((region) => ({
    ...region,
    rings: region.path
      .split('M')
      .slice(1)
      .map((ring) =>
        ring
          .replace(/Z/g, '')
          .split('L')
          .map((point) => point.split(',').map(Number)),
      ),
  }));
}

export function pickSubdivision(
  camera: SubdivisionCamera,
  regions: ReturnType<typeof subdivisionPickShapes>,
  x: number,
  y: number,
) {
  if (!camera.scale) return null;
  let nearest: string | null = null;
  let nearestDistance = 10;
  for (const region of regions) {
    if (!needsSubdivisionMarker(region, camera.scale)) continue;
    const point = camera.projectPoint(region.point);
    const distance = Math.hypot(point[0] - x, point[1] - y);
    if (distance < nearestDistance) {
      nearest = region.id;
      nearestDistance = distance;
    }
  }
  if (nearest) return nearest;
  const point = camera.unprojectScreen(x, y);
  for (const region of regions) {
    const [[left, top], [right, bottom]] = region.bounds;
    if (
      point[0] < left ||
      point[0] > right ||
      point[1] < top ||
      point[1] > bottom
    )
      continue;
    let inside = false;
    // Even-odd winding matches the SVG fill rule, including holes and islands.
    for (const ring of region.rings) {
      for (
        let index = 0, previous = ring.length - 1;
        index < ring.length;
        previous = index++
      ) {
        const a = ring[index];
        const b = ring[previous];
        if (
          a[1] > point[1] !== b[1] > point[1] &&
          point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
        )
          inside = !inside;
      }
    }
    if (inside) return region.id;
  }
  return null;
}
