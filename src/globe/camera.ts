import { mat3, quat, vec3 } from 'gl-matrix';

import { toCartesian, toGeographic } from './coordinates';

export class GlobeCamera {
  readonly rotation = quat.create();
  width = 0;
  height = 0;
  zoom = 1.2;

  constructor() {
    this.reset();
  }

  get radius() {
    return (Math.min(this.width, this.height) * this.zoom) / 2;
  }

  reset() {
    quat.identity(this.rotation);
    quat.rotateY(this.rotation, this.rotation, Math.PI / 9);
    this.zoom = 1.2;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setZoom(zoom: number) {
    this.zoom = Math.max(0.9, Math.min(8, zoom));
  }

  focus(anchor: readonly number[], angularRadius: number) {
    this.orient(anchor);
    this.setZoom(
      Math.max(1.2, 0.68 / Math.sin(Math.min(Math.PI / 2, angularRadius))),
    );
  }

  northUp() {
    const center = this.geographicPoint(this.width / 2, this.height / 2);
    if (center) this.orient(center);
  }

  zoomAt(zoom: number, x: number, y: number, previousX = x, previousY = y) {
    const anchor = this.geographicPoint(previousX, previousY);
    this.setZoom(zoom);
    if (!anchor) return;
    const px = (x - this.width / 2) / this.radius;
    const py = (this.height / 2 - y) / this.radius;
    if (px * px + py * py >= 1) return;
    const current = vec3.transformQuat(
      vec3.create(),
      toCartesian(anchor),
      this.rotation,
    );
    const desired = vec3.fromValues(px, py, Math.sqrt(1 - px * px - py * py));
    const delta = quat.rotationTo(quat.create(), current, desired);
    quat.multiply(this.rotation, delta, this.rotation);
    quat.normalize(this.rotation, this.rotation);
  }

  private orient([longitude, latitude]: readonly number[]) {
    quat.identity(this.rotation);
    quat.rotateX(this.rotation, this.rotation, (latitude * Math.PI) / 180);
    quat.rotateY(this.rotation, this.rotation, (-longitude * Math.PI) / 180);
  }

  drag(dx: number, dy: number) {
    if (!this.radius) return;
    const delta = quat.create();
    quat.rotateY(delta, delta, dx / this.radius);
    quat.rotateX(delta, delta, dy / this.radius);
    quat.multiply(this.rotation, delta, this.rotation);
    quat.normalize(this.rotation, this.rotation);
  }

  matrix() {
    return mat3.fromQuat(mat3.create(), this.rotation);
  }

  twist(radians: number, x = this.width / 2, y = this.height / 2) {
    if (!this.radius) return;
    // Rotate around the touched surface point, keeping the pinch pivot fixed.
    const px = (x - this.width / 2) / this.radius;
    const py = (this.height / 2 - y) / this.radius;
    const squared = px * px + py * py;
    const axis = squared < 1 ? [px, py, Math.sqrt(1 - squared)] : [0, 0, 1];
    const delta = quat.setAxisAngle(quat.create(), axis, -radians);
    quat.multiply(this.rotation, delta, this.rotation);
    quat.normalize(this.rotation, this.rotation);
  }

  geographicPoint(x: number, y: number) {
    if (!this.radius) return null;
    const px = (x - this.width / 2) / this.radius;
    const py = (this.height / 2 - y) / this.radius;
    const squared = px * px + py * py;
    if (squared > 1) return null;
    const point = vec3.fromValues(px, py, Math.sqrt(1 - squared));
    vec3.transformQuat(point, point, quat.invert(quat.create(), this.rotation));
    return toGeographic(point);
  }

  project(position: readonly number[]) {
    const point = vec3.transformQuat(
      vec3.create(),
      [position[0], position[1], position[2]],
      this.rotation,
    );
    if (point[2] <= 0) return null;
    return [
      this.width / 2 + point[0] * this.radius,
      this.height / 2 - point[1] * this.radius,
    ];
  }
}
