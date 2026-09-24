import {
  flatCountryById,
  mapSize,
  projection,
  countryAnchors,
} from './geography';

export class FlatCamera {
  width = 0;
  height = 0;
  zoom = 2;
  center: number[] = projection([-20, 15])!;
  initialized = false;

  get scale() {
    return (
      Math.min(this.width / mapSize.width, this.height / mapSize.height) *
      this.zoom
    );
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.clamp();
  }

  start(home: string | null) {
    if (this.initialized || !this.width || !this.height) return;
    this.initialized = true;
    const fitScale = Math.min(
      this.width / mapSize.width,
      this.height / mapSize.height,
    );
    this.zoom = Math.max(2, (this.height * 0.8) / (mapSize.height * fitScale));
    const anchor = home && countryAnchors.get(home)?.anchor;
    if (anchor) this.center = projection(anchor as [number, number])!;
    this.clamp();
  }

  fitWorld() {
    this.zoom = 1;
    this.center = [mapSize.width / 2, mapSize.height / 2];
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
    const anchor = this.unprojectScreen(previousX, previousY);
    this.zoom = Math.max(1, Math.min(20, zoom));
    this.center = [
      anchor[0] - (x - this.width / 2) / this.scale,
      anchor[1] - (y - this.height / 2) / this.scale,
    ];
    this.clamp();
  }

  focus(id: string) {
    const country = flatCountryById.get(id);
    const anchor = countryAnchors.get(id)?.anchor;
    if (!country || !anchor || !this.width) return;
    const [[left, top], [right, bottom]] = country.bounds;
    const fit = Math.min(
      this.width / mapSize.width,
      this.height / mapSize.height,
    );
    this.zoom = Math.max(
      2,
      Math.min(
        16,
        Math.min(
          (this.width * 0.65) / Math.max(1, right - left),
          (this.height * 0.5) / Math.max(1, bottom - top),
        ) / fit,
      ),
    );
    this.center = projection(anchor as [number, number])!;
    this.clamp();
  }

  project(point: readonly number[]) {
    const projected = projection(point as [number, number]);
    return projected ? this.projectPoint(projected) : null;
  }

  projectPoint(point: readonly number[]) {
    return [
      this.width / 2 + (point[0] - this.center[0]) * this.scale,
      this.height / 2 + (point[1] - this.center[1]) * this.scale,
    ];
  }

  geographicPoint(x: number, y: number) {
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

  private unprojectScreen(x: number, y: number): [number, number] {
    return [
      (x - this.width / 2) / this.scale + this.center[0],
      (y - this.height / 2) / this.scale + this.center[1],
    ];
  }

  private clamp() {
    if (!this.scale) return;
    this.center = this.center.map((value, index) => {
      const size = index ? mapSize.height : mapSize.width;
      const extent = (index ? this.height : this.width) / this.scale;
      return extent >= size
        ? size / 2
        : Math.max(extent / 2, Math.min(size - extent / 2, value));
    });
  }
}
