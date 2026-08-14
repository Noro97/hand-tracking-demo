import { aimRay, pointAlongRay, rayCircleHit, type Ray } from '../lib/aiming';
import { PinchTracker } from '../lib/filters';
import {
  isPistolPose,
  triggerDistance,
  TRIGGER_DEBOUNCE_MS,
  TRIGGER_ENTER_REL,
  TRIGGER_EXIT_REL,
} from '../lib/pistolPose';
import type { HandObservation, Handedness } from '../lib/recognition';
import type { Point } from '../types';

const TARGET_RADIUS_PX = 42;
const MAX_TARGETS = 4;
const SPAWN_INTERVAL_MS = 900;
const TARGET_LIFETIME_MS = 4200;
/** Keeps spawns clear of the canvas edge so a whole target is always reachable. */
const SPAWN_MARGIN_PX = 70;
const TRACER_LIFETIME_MS = 140;
const TRACER_LENGTH_PX = 2000;

export interface Target {
  id: number;
  center: Point;
  radius: number;
  bornAt: number;
  expiresAt: number;
}

export interface Tracer {
  from: Point;
  to: Point;
  firedAt: number;
  hit: boolean;
}

/** Per-hand aiming state, for drawing the crosshair and pose feedback. */
export interface AimState {
  handedness: Handedness;
  armed: boolean;
  ray: Ray | null;
}

export interface ShootingGameState {
  running: boolean;
  score: number;
  shots: number;
  hits: number;
  targets: Target[];
  tracers: Tracer[];
  aims: AimState[];
}

const INITIAL_STATE: ShootingGameState = {
  running: false,
  score: 0,
  shots: 0,
  hits: 0,
  targets: [],
  tracers: [],
  aims: [],
};

/**
 * Framework-agnostic shooting game driven by the pistol gesture: index finger
 * aims, dropping the thumb onto the fist fires.
 *
 * The trigger reuses {@link PinchTracker} rather than thresholding raw
 * distance — it already provides exactly what a trigger needs (hysteresis so a
 * thumb hovering at the threshold can't chatter, plus a debounce), and edge
 * detection on its confirmed state gives one shot per pull instead of one per
 * frame held.
 *
 * Clock and RNG are injected so the whole thing is deterministically testable,
 * the same pattern BBTSessionController uses for time.
 */
export class ShootingGameController {
  private state: ShootingGameState = { ...INITIAL_STATE };
  private readonly triggers = new Map<Handedness, PinchTracker>();
  private readonly wasPulled = new Map<Handedness, boolean>();
  private nextTargetId = 1;
  private lastSpawnAt = 0;

  constructor(
    private readonly onStateChange: (state: ShootingGameState) => void,
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
  ) {}

  getState(): ShootingGameState {
    return this.state;
  }

  start(): void {
    this.triggers.clear();
    this.wasPulled.clear();
    this.nextTargetId = 1;
    // -Infinity, not 0: the first frame must spawn immediately whatever the
    // clock's origin. Anchoring at 0 only looks right because Date.now() is
    // huge — with a clock starting near zero the game would sit empty for a
    // full spawn interval.
    this.lastSpawnAt = Number.NEGATIVE_INFINITY;
    this.state = { ...INITIAL_STATE, running: true };
    this.onStateChange(this.state);
  }

  stop(): void {
    this.state = { ...this.state, running: false, targets: [], tracers: [], aims: [] };
    this.onStateChange(this.state);
  }

  /** Per camera frame: age the world, read each hand's pose, fire on trigger edges. */
  frame(hands: HandObservation[], width: number, height: number): void {
    if (!this.state.running) return;
    const now = this.now();

    let targets = this.state.targets.filter((target) => target.expiresAt > now);
    const tracers = this.state.tracers.filter((tracer) => now - tracer.firedAt < TRACER_LIFETIME_MS);

    if (targets.length < MAX_TARGETS && now - this.lastSpawnAt >= SPAWN_INTERVAL_MS) {
      this.lastSpawnAt = now;
      targets = [...targets, this.spawnTarget(width, height, now)];
    }

    const aims: AimState[] = [];
    let { score, shots, hits } = this.state;
    const newTracers: Tracer[] = [];

    for (const hand of hands) {
      const armed = isPistolPose(hand.landmarks);
      const ray = armed ? aimRay(hand.landmarks, width, height) : null;
      aims.push({ handedness: hand.handedness, armed, ray });

      const tracker = this.trackerFor(hand.handedness);
      // A non-pistol hand must not accumulate trigger state, or lowering the
      // thumb while simply resting the hand would fire the moment it re-arms.
      const pulled = armed ? tracker.update(triggerDistance(hand.landmarks), now) : this.resetTrigger(hand.handedness);

      const justPulled = pulled && this.wasPulled.get(hand.handedness) !== true;
      this.wasPulled.set(hand.handedness, pulled);

      if (!justPulled || !ray) continue;

      shots++;
      const struck = nearestHit(ray, targets);
      if (struck) {
        hits++;
        score += 100;
        targets = targets.filter((target) => target.id !== struck.target.id);
        newTracers.push({ from: ray.origin, to: struck.point, firedAt: now, hit: true });
      } else {
        newTracers.push({ from: ray.origin, to: pointAlongRay(ray, TRACER_LENGTH_PX), firedAt: now, hit: false });
      }
    }

    this.state = { ...this.state, score, shots, hits, targets, tracers: [...tracers, ...newTracers], aims };
    this.onStateChange(this.state);
  }

  private resetTrigger(handedness: Handedness): boolean {
    this.trackerFor(handedness).reset();
    return false;
  }

  private trackerFor(handedness: Handedness): PinchTracker {
    let tracker = this.triggers.get(handedness);
    if (!tracker) {
      tracker = new PinchTracker(TRIGGER_ENTER_REL, TRIGGER_EXIT_REL, TRIGGER_DEBOUNCE_MS);
      this.triggers.set(handedness, tracker);
    }
    return tracker;
  }

  private spawnTarget(width: number, height: number, now: number): Target {
    const span = (extent: number) => SPAWN_MARGIN_PX + this.random() * Math.max(1, extent - SPAWN_MARGIN_PX * 2);
    return {
      id: this.nextTargetId++,
      center: { x: span(width), y: span(height) },
      radius: TARGET_RADIUS_PX,
      bornAt: now,
      expiresAt: now + TARGET_LIFETIME_MS,
    };
  }
}

/** Closest target the ray strikes, so a shot can't punch through a nearer one. */
function nearestHit(ray: Ray, targets: Target[]): { target: Target; point: Point } | null {
  let best: { target: Target; point: Point; distance: number } | null = null;

  for (const target of targets) {
    const distance = rayCircleHit(ray, target.center, target.radius);
    if (distance === null) continue;
    if (!best || distance < best.distance) {
      best = { target, point: pointAlongRay(ray, distance), distance };
    }
  }
  return best ? { target: best.target, point: best.point } : null;
}
