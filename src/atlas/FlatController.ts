import { theme } from '../theme';
import type { FlatCamera } from './FlatCamera';
import { PanMomentum } from './PanMomentum';

export class FlatController {
  private active = false;
  private reduceMotion = true;
  private frame: number | null = null;
  private lastTime: number | null = null;
  private readonly momentum = new PanMomentum();
  private interacting = false;
  private transition: {
    start: number;
    from: number[];
    to: number[];
    fromZoom: number;
    toZoom: number;
  } | null = null;

  constructor(
    readonly camera: FlatCamera,
    private onFrame: (moving: boolean) => void = () => undefined,
  ) {}

  setFrameHandler(onFrame: (moving: boolean) => void) {
    this.onFrame = onFrame;
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.invalidate();
    else {
      this.interacting = false;
      // An iOS alert can interrupt an acknowledged camera command.
      if (this.transition) {
        this.camera.center = this.transition.to;
        this.camera.zoom = this.transition.toZoom;
      }
      this.stop();
    }
  }

  setReduceMotion(enabled: boolean) {
    this.reduceMotion = enabled;
    if (enabled) {
      if (this.transition) {
        this.camera.center = this.transition.to;
        this.camera.zoom = this.transition.toZoom;
      }
      this.stop();
    }
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.stop();
    this.camera.resize(width, height);
    this.invalidate();
  }
  drag(dx: number, dy: number) {
    this.camera.drag(dx, dy);
    this.invalidate();
  }
  zoom(
    zoom: number,
    x: number,
    y: number,
    previousX: number,
    previousY: number,
  ) {
    this.camera.zoomAt(zoom, x, y, previousX, previousY);
    this.invalidate();
  }

  move(change: () => void) {
    this.stop();
    const from = [...this.camera.center];
    const fromZoom = this.camera.zoom;
    change();
    if (
      !this.reduceMotion &&
      this.active &&
      (fromZoom !== this.camera.zoom ||
        from.some((value, index) => value !== this.camera.center[index]))
    ) {
      this.transition = {
        start: performance.now(),
        from,
        fromZoom,
        to: [...this.camera.center],
        toZoom: this.camera.zoom,
      };
      this.camera.center = from;
      this.camera.zoom = fromZoom;
    }
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

  coast(x: number, y: number) {
    if (this.reduceMotion || !this.active) return;
    this.momentum.start(x, y);
    this.lastTime = performance.now();
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

  private invalidate() {
    if (this.frame === null && this.active)
      this.frame = requestAnimationFrame(this.draw);
  }

  private draw = (time: number) => {
    this.frame = null;
    if (!this.active) return;
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
      this.camera.center = move.from.map(
        (value, index) => value + (move.to[index] - value) * eased,
      );
      this.camera.zoom = move.fromZoom + (move.toZoom - move.fromZoom) * eased;
      if (progress === 1) this.transition = null;
    } else if (this.momentum.moving) {
      const before = this.camera.center;
      const delta = this.momentum.step(dt);
      this.camera.drag(delta.x, delta.y);
      // Stop each axis at the map edge instead of spending frames pushing against it.
      if (this.camera.center[0] === before[0]) this.momentum.x = 0;
      if (this.camera.center[1] === before[1]) this.momentum.y = 0;
    }
    this.onFrame(this.interacting || !!this.transition || this.momentum.moving);
    if (this.transition || this.momentum.moving) this.invalidate();
    else this.lastTime = null;
  };
}
