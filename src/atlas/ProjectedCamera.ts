type Size = { width: number; height: number };

/** Camera math shared by every interactive SVG map, in unmirrored map coordinates. */
export class ProjectedCamera {
  width = 0;
  height = 0;
  zoom = 1;
  center: number[];
  protected fitScale = 0;

  constructor(
    readonly map: Size,
    private readonly maxZoom: number,
    private readonly verticalBounds: 'map' | 'center' = 'map',
  ) {
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
    this.zoom = Math.max(1, Math.min(this.maxZoom, zoom));
    this.center = [
      anchor[0] - (x - this.width / 2) / this.scale,
      anchor[1] - (y - this.height / 2) / this.scale,
    ];
    this.clamp();
  }

  projectPoint(point: readonly number[]): [number, number] {
    return [
      this.width / 2 + (point[0] - this.center[0]) * this.scale,
      this.height / 2 + (point[1] - this.center[1]) * this.scale,
    ];
  }

  unprojectScreen(x: number, y: number): [number, number] {
    return [
      (x - this.width / 2) / this.scale + this.center[0],
      (y - this.height / 2) / this.scale + this.center[1],
    ];
  }

  protected clamp() {
    if (!this.scale) return;
    this.center = this.center.map((value, index) => {
      const size = index ? this.map.height : this.map.width;
      // World maps can bring either pole to mid-screen, clear of the controls.
      if (index === 1 && this.verticalBounds === 'center')
        return Math.max(0, Math.min(size, value));
      const extent = (index ? this.height : this.width) / this.scale;
      return extent >= size
        ? size / 2
        : Math.max(extent / 2, Math.min(size - extent / 2, value));
    });
  }
}
