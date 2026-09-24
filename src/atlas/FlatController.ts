import { theme } from '../theme';
import type { FlatCamera } from './FlatCamera';

export class FlatController {
  private active = false;
  private reduceMotion = true;
  private frame: number | null = null;
  private transition: {
    start: number | null;
    from: number[];
    to: number[];
    fromZoom: number;
    toZoom: number;
  } | null = null;

  constructor(
    readonly camera: FlatCamera,
    private readonly onFrame: () => void,
  ) {}

  setActive(active: boolean) {
    this.active = active;
    if (active) this.invalidate();
    else this.stop();
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
        start: null,
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

  stop() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
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
    if (this.transition) {
      const move = this.transition;
      move.start ??= time;
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
    }
    this.onFrame();
    if (this.transition) this.invalidate();
  };
}
