import { quat } from 'gl-matrix';

import type { AppData } from '../data/model';
import { GlobeCamera } from './camera';
import type { GlobeRenderer } from './renderer';

type Transition = {
  start: number | null;
  from: quat;
  to: quat;
  fromZoom: number;
  toZoom: number;
};

export class GlobeController {
  private renderer: GlobeRenderer | null = null;
  private frame: number | null = null;
  private lastTime: number | null = null;
  private velocity = { x: 0, y: 0 };
  private active = false;
  private reduceMotion = true;
  private places: AppData['places'] = {};
  private selectedId: string | null = null;
  private colorsDirty = true;
  private transition: Transition | null = null;

  constructor(
    private readonly onError: (error: unknown) => void,
    readonly camera = new GlobeCamera(),
    private readonly onFrame: () => void = () => undefined,
  ) {}

  get ready() {
    return this.renderer !== null;
  }

  attach(renderer: GlobeRenderer) {
    this.detach();
    this.renderer = renderer;
    this.colorsDirty = true;
    this.invalidate();
  }

  detach() {
    this.renderer?.dispose();
    this.renderer = null;
    this.stop();
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.invalidate();
    else this.stop();
  }

  setReduceMotion(enabled: boolean) {
    this.reduceMotion = enabled;
    if (enabled) this.stop();
  }

  setColors(places: AppData['places'], selectedId: string | null = null) {
    this.places = places;
    this.selectedId = selectedId;
    this.colorsDirty = true;
    this.invalidate();
  }

  resize(width: number, height: number) {
    this.camera.resize(width, height);
    this.invalidate();
  }

  move(change: () => void) {
    this.stop();
    const from = quat.clone(this.camera.rotation);
    const fromZoom = this.camera.zoom;
    change();
    if (!this.reduceMotion && this.active && this.renderer) {
      this.transition = {
        start: null,
        from,
        fromZoom,
        to: quat.clone(this.camera.rotation),
        toZoom: this.camera.zoom,
      };
      quat.copy(this.camera.rotation, from);
      this.camera.zoom = fromZoom;
    }
    this.invalidate();
  }

  reset() {
    this.move(() => this.camera.reset());
  }
  northUp() {
    this.move(() => this.camera.northUp());
  }

  drag(dx: number, dy: number) {
    this.camera.drag(dx, dy);
    this.invalidate();
  }

  zoom(
    zoom: number,
    x = this.camera.width / 2,
    y = this.camera.height / 2,
    previousX = x,
    previousY = y,
  ) {
    this.camera.zoomAt(zoom, x, y, previousX, previousY);
    this.invalidate();
  }

  twist(radians: number) {
    this.camera.twist(radians);
    this.invalidate();
  }

  coast(x: number, y: number) {
    if (this.reduceMotion || !this.active) return;
    const scale = Math.min(1, 1600 / Math.max(1, Math.hypot(x, y)));
    this.velocity = { x: x * scale, y: y * scale };
    this.lastTime = null;
    this.invalidate();
  }

  stop() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTime = null;
    this.velocity = { x: 0, y: 0 };
    this.transition = null;
    this.invalidate();
  }

  private invalidate() {
    if (this.frame === null && this.active && this.renderer)
      this.frame = requestAnimationFrame(this.draw);
  }

  private draw = (time: number) => {
    this.frame = null;
    if (!this.active || !this.renderer) return;
    const dt =
      this.lastTime === null
        ? 0
        : Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    if (this.transition) {
      const move = this.transition;
      move.start ??= time;
      const progress = Math.min(1, (time - move.start) / 420);
      const eased = 1 - (1 - progress) ** 3;
      quat.slerp(this.camera.rotation, move.from, move.to, eased);
      this.camera.setZoom(
        move.fromZoom + (move.toZoom - move.fromZoom) * eased,
      );
      if (progress === 1) this.transition = null;
    } else {
      this.camera.drag(this.velocity.x * dt, this.velocity.y * dt);
      const decay = Math.exp(-5 * dt);
      this.velocity.x *= decay;
      this.velocity.y *= decay;
    }
    try {
      if (this.colorsDirty) {
        this.renderer.setColors(this.places, this.selectedId);
        this.colorsDirty = false;
      }
      this.renderer.draw(this.camera);
      this.onFrame();
    } catch (error) {
      this.detach();
      this.onError(error);
      return;
    }
    if (this.transition || Math.hypot(this.velocity.x, this.velocity.y) > 5)
      this.invalidate();
    else {
      this.lastTime = null;
      this.velocity = { x: 0, y: 0 };
    }
  };
}
