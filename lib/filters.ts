/**
 * Adaptive low-pass filter for noisy 2D signals.
 * Cutoff frequency rises with signal velocity, so slow movements are heavily
 * smoothed (kills jitter) while fast movements pass through with minimal lag.
 * Reference: G. Casiez et al. "1€ Filter" (CHI 2012).
 */
export class OneEuroFilter {
  private hasPrev = false;
  private prevValue = 0;
  private prevDerivative = 0;
  private prevTime = 0;

  constructor(
    private readonly minCutoff: number,
    private readonly beta: number,
    private readonly dCutoff: number,
  ) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value: number, timestampMs: number): number {
    if (!this.hasPrev) {
      this.hasPrev = true;
      this.prevValue = value;
      this.prevDerivative = 0;
      this.prevTime = timestampMs;
      return value;
    }
    const dt = (timestampMs - this.prevTime) / 1000;
    if (dt <= 0) return this.prevValue;

    const rawDerivative = (value - this.prevValue) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const derivative = aD * rawDerivative + (1 - aD) * this.prevDerivative;

    const cutoff = this.minCutoff + this.beta * Math.abs(derivative);
    const a = this.alpha(cutoff, dt);
    const filtered = a * value + (1 - a) * this.prevValue;

    this.prevValue = filtered;
    this.prevDerivative = derivative;
    this.prevTime = timestampMs;
    return filtered;
  }

  reset(): void {
    this.hasPrev = false;
  }
}

/**
 * Pinch state tracker with hysteresis + temporal debounce.
 * - Hysteresis: different thresholds for entering and exiting the Pinch state,
 *   so a hand held near the threshold cannot flicker.
 * - Debounce: a candidate state must hold for `debounceMs` before it becomes
 *   the confirmed state. Filters out incidental anatomical noise.
 */
export class PinchTracker {
  private candidate = false;
  private candidateSince = 0;
  private confirmed = false;

  constructor(
    private readonly enterThreshold: number,
    private readonly exitThreshold: number,
    private readonly debounceMs: number,
  ) {}

  /** @param relDist  Pinch distance normalized by hand size (scale-invariant). */
  update(relDist: number, timestampMs: number): boolean {
    const next = this.candidate
      ? relDist < this.exitThreshold
      : relDist < this.enterThreshold;

    if (next !== this.candidate) {
      this.candidate = next;
      this.candidateSince = timestampMs;
    }
    if (timestampMs - this.candidateSince >= this.debounceMs) {
      this.confirmed = this.candidate;
    }
    return this.confirmed;
  }

  reset(): void {
    this.candidate = false;
    this.candidateSince = 0;
    this.confirmed = false;
  }
}

// One Euro Filter parameters (tuned for ~30 fps webcam input).
export const ONE_EURO_MIN_CUTOFF = 1.2;
export const ONE_EURO_BETA = 0.01;
export const ONE_EURO_D_CUTOFF = 1.0;

// Pinch thresholds are RELATIVE to hand size (distance wrist → middle-MCP) so
// the gesture works the same whether the hand is 20 cm or 2 m from the camera.
// Typical ratios: ~0.20 when fingertips touch, ~0.80 when fully spread.
export const PINCH_ENTER_REL = 0.40;
export const PINCH_EXIT_REL = 0.55;
export const PINCH_DEBOUNCE_MS = 150;
