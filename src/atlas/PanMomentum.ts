// Integrate exponential friction so momentum travels the same distance at 60/120 Hz.
export class PanMomentum {
  x = 0;
  y = 0;

  get moving() {
    return Math.hypot(this.x, this.y) > 5;
  }

  start(x: number, y: number) {
    const scale = Math.min(1, 1600 / Math.max(1, Math.hypot(x, y)));
    this.x = x * scale;
    this.y = y * scale;
  }

  stop() {
    this.x = 0;
    this.y = 0;
  }

  step(seconds: number) {
    const decay = Math.exp(-5 * seconds);
    const distance = (1 - decay) / 5;
    const delta = { x: this.x * distance, y: this.y * distance };
    this.x *= decay;
    this.y *= decay;
    if (!this.moving) this.stop();
    return delta;
  }
}
