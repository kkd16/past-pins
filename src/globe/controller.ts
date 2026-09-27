import { quat } from 'gl-matrix';

import { PanMomentum } from '../atlas/PanMomentum';
import type { AppData } from '../data/model';
import { theme } from '../theme';
import { GlobeCamera } from './camera';
import type { GlobeRenderer } from './renderer';

type Transition = {
  start: number;
  from: quat;
  to: quat;
  fromZoom: number;
  toZoom: number;
};

export class GlobeController {
  private renderer: GlobeRenderer | null = null;
  private frame: number | null = null;
  private lastTime: number | null = null;
  private readonly momentum = new PanMomentum();
  private interacting = false;
  private active = false;
  private reduceMotion = true;
  private places: AppData['places'] = {};
  private selectedId: string | null = null;
  private colorsDirty = true;
  private transition: Transition | null = null;

  constructor(
    private readonly onError: (error: unknown) => void,
    readonly camera = new GlobeCamera(),
    private onFrame: (moving: boolean) => void = () => undefined,
  ) {}

  setFrameHandler(onFrame: (moving: boolean) => void) {
    this.onFrame = onFrame;
  }

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
    this.finishMove();
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.invalidate();
    else {
      this.interacting = false;
      this.finishMove();
    }
  }

  setReduceMotion(enabled: boolean) {
    this.reduceMotion = enabled;
    if (enabled) this.finishMove();
  }

  setColors(places: AppData['places'], selectedId: string | null = null) {
    this.places = places;
    this.selectedId = selectedId;
    this.colorsDirty = true;
    this.invalidate();
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    if (width === this.camera.width && height === this.camera.height) return;
    this.finishMove();
    this.camera.resize(width, height);
    this.invalidate();
  }

  move(change: () => void) {
    this.stop();
    const from = quat.clone(this.camera.rotation);
    const fromZoom = this.camera.zoom;
    change();
    if (
      !this.reduceMotion &&
      this.active &&
      this.renderer &&
      (fromZoom !== this.camera.zoom ||
        !quat.equals(from, this.camera.rotation))
    ) {
      this.transition = {
        start: performance.now(),
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

  twist(radians: number, x?: number, y?: number) {
    this.camera.twist(radians, x, y);
    this.invalidate();
  }

  coast(x: number, y: number) {
    if (this.reduceMotion || !this.active) return;
    this.momentum.start(x, y);
    this.lastTime = performance.now();
    this.invalidate();
  }

  beginInteraction() {
    this.interacting = true;
    this.stop();
  }

  endInteraction() {
    this.interacting = false;
    this.invalidate();
  }

  stop() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTime = null;
    this.momentum.stop();
    this.transition = null;
    this.invalidate();
  }

  private finishMove() {
    if (this.transition) {
      quat.copy(this.camera.rotation, this.transition.to);
      this.camera.zoom = this.transition.toZoom;
    }
    this.stop();
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
      const progress = Math.min(
        1,
        (time - move.start) / theme.motion.cameraDuration,
      );
      const eased = 1 - (1 - progress) ** 3;
      quat.slerp(this.camera.rotation, move.from, move.to, eased);
      this.camera.setZoom(
        move.fromZoom + (move.toZoom - move.fromZoom) * eased,
      );
      if (progress === 1) this.transition = null;
    } else if (this.momentum.moving) {
      const delta = this.momentum.step(dt);
      this.camera.drag(delta.x, delta.y);
    }
    try {
      if (this.colorsDirty) {
        this.renderer.setColors(this.places, this.selectedId);
        this.colorsDirty = false;
      }
      this.renderer.draw(this.camera);
      this.onFrame(
        this.interacting || !!this.transition || this.momentum.moving,
      );
    } catch (error) {
      this.detach();
      this.onError(error);
      return;
    }
    if (this.transition || this.momentum.moving) this.invalidate();
    else {
      this.lastTime = null;
      this.momentum.stop();
    }
  };
}
