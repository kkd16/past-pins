import type { SubdivisionMapRegion } from './types';

type Size = { width: number; height: number };
type Bounds = readonly (readonly number[])[];

export const subdivisionMapMaxZoom = 60;

export class SubdivisionCamera {
  width = 0;
  height = 0;
  zoom = 1;
  center: number[];
  private fitScale = 0;

  constructor(readonly map: Size) {
    this.center = [map.width / 2, map.height / 2];
  }

  get scale() {
    return this.fitScale * this.zoom;
  }

  get matrix() {
    const scale = this.scale;
    return [
      scale,
      0,
      0,
      scale,
      this.width / 2 - this.center[0] * scale,
      this.height / 2 - this.center[1] * scale,
    ];
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.fitScale =
      width > 0 && height > 0 && this.map.width > 0 && this.map.height > 0
        ? Math.min(width / this.map.width, height / this.map.height)
        : 0;
    this.clamp();
  }

  fit() {
    this.zoom = 1;
    this.center = [this.map.width / 2, this.map.height / 2];
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

  drag(dx: number, dy: number) {
    if (!this.scale) return;
    this.center = [
      this.center[0] - dx / this.scale,
      this.center[1] - dy / this.scale,
    ];
    this.clamp();
  }

  zoomAt(zoom: number, x: number, y: number, previousX = x, previousY = y) {
    if (!this.scale) return;
    const anchor = this.unproject(previousX, previousY);
    this.zoom = Math.max(1, Math.min(subdivisionMapMaxZoom, zoom));
    this.center = [
      anchor[0] - (x - this.width / 2) / this.scale,
      anchor[1] - (y - this.height / 2) / this.scale,
    ];
    this.clamp();
  }

  project(point: readonly number[]) {
    return [
      this.width / 2 + (point[0] - this.center[0]) * this.scale,
      this.height / 2 + (point[1] - this.center[1]) * this.scale,
    ];
  }

  unproject(x: number, y: number) {
    return [
      (x - this.width / 2) / this.scale + this.center[0],
      (y - this.height / 2) / this.scale + this.center[1],
    ];
  }

  private clamp() {
    if (!this.scale) return;
    this.center = this.center.map((value, index) => {
      const size = index ? this.map.height : this.map.width;
      const extent = (index ? this.height : this.width) / this.scale;
      return extent >= size
        ? size / 2
        : Math.max(extent / 2, Math.min(size - extent / 2, value));
    });
  }
}

export class SubdivisionController {
  private enabled = true;
  private draw: () => void = () => undefined;

  constructor(readonly camera: SubdivisionCamera) {}

  configure(enabled: boolean, draw: () => void) {
    this.enabled = enabled;
    this.draw = draw;
  }

  beginInteraction() {}
  endInteraction() {}
  coast() {}

  drag(dx: number, dy: number) {
    if (!this.enabled) return;
    this.camera.drag(dx, dy);
    this.draw();
  }

  zoom(
    zoom: number,
    x: number,
    y: number,
    previousX: number,
    previousY: number,
  ) {
    if (!this.enabled) return;
    this.camera.zoomAt(zoom, x, y, previousX, previousY);
    this.draw();
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
    const point = camera.project(region.point);
    const distance = Math.hypot(point[0] - x, point[1] - y);
    if (distance < nearestDistance) {
      nearest = region.id;
      nearestDistance = distance;
    }
  }
  if (nearest) return nearest;
  const point = camera.unproject(x, y);
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
