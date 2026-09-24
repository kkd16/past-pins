import { GlobeCamera } from './camera';
import type { GlobeRenderer } from './renderer';

export class GlobeController {
  readonly camera = new GlobeCamera();
  private renderer: GlobeRenderer | null = null;
  private frame: number | null = null;
  private lastTime: number | null = null;
  private velocity = { x: 0, y: 0 };
  private active = false;
  private reduceMotion = true;
  private visitedIds: ReadonlySet<string> = new Set();
  private colorsDirty = true;

  constructor(private readonly onError: (error: unknown) => void) {}

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

  setColors(visitedIds: ReadonlySet<string>) {
    this.visitedIds = visitedIds;
    this.colorsDirty = true;
    this.invalidate();
  }

  resize(width: number, height: number) {
    this.camera.resize(width, height);
    this.invalidate();
  }

  reset() {
    this.camera.reset();
    this.stop();
  }

  drag(dx: number, dy: number) {
    this.camera.drag(dx, dy);
    this.invalidate();
  }

  zoom(zoom: number) {
    this.camera.setZoom(zoom);
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
    this.invalidate();
  }

  private invalidate() {
    if (this.frame === null && this.active && this.renderer) {
      this.frame = requestAnimationFrame(this.draw);
    }
  }

  private draw = (time: number) => {
    this.frame = null;
    if (!this.active || !this.renderer) return;
    const dt =
      this.lastTime === null
        ? 0
        : Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.camera.drag(this.velocity.x * dt, this.velocity.y * dt);
    const decay = Math.exp(-5 * dt);
    this.velocity.x *= decay;
    this.velocity.y *= decay;
    try {
      if (this.colorsDirty) {
        this.renderer.setColors(this.visitedIds);
        this.colorsDirty = false;
      }
      this.renderer.draw(this.camera);
    } catch (error) {
      this.detach();
      this.onError(error);
      return;
    }
    if (Math.hypot(this.velocity.x, this.velocity.y) > 5) this.invalidate();
    else {
      this.lastTime = null;
      this.velocity = { x: 0, y: 0 };
    }
  };
}
