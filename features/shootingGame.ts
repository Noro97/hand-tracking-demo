import { aimFromHand, mirrorAim, pointInCircle, type Aim } from '../lib/aiming';
import type { SoundEffect } from '../lib/audioBus';
import { OneEuroFilter, PinchTracker } from '../lib/filters';
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

/**
 * Cursor smoothing. Raw fingertip landmarks jitter every frame; without this
 * the crosshair visibly shakes and fine aim is impossible. Tuned a little
 * livelier than the BBT pointer (higher beta) because a game cursor must keep
 * up with fast flicks — raise beta further if it feels laggy, raise minCutoff
 * if it still shakes.
 */
const CURSOR_MIN_CUTOFF = 1.0;
const CURSOR_BETA = 0.02;
const CURSOR_D_CUTOFF = 1.0;

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
  aim: Aim | null;
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
  private readonly cursorFilters = new Map<Handedness, { x: OneEuroFilter; y: OneEuroFilter }>();
  private nextTargetId = 1;
  private lastSpawnAt = 0;

  constructor(
    private readonly onStateChange: (state: ShootingGameState) => void,
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
    private readonly onSound?: (sound: SoundEffect) => void,
  ) {}

  getState(): ShootingGameState {
    return this.state;
  }

  start(): void {
    this.triggers.clear();
    this.wasPulled.clear();
    this.cursorFilters.clear();
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

  /** Advances world simulation (target spawning and expiration, tracer lifetime). Can run on rAF. */
  tick(now: number = this.now(), width: number, height: number): void {
    if (!this.state.running) return;

    const unexpiredTargets = this.state.targets.filter((target) => target.expiresAt > now);
    if (unexpiredTargets.length < this.state.targets.length) {
      this.onSound?.('expire');
    }
    let targets = unexpiredTargets;
    const tracers = this.state.tracers.filter((tracer) => now - tracer.firedAt < TRACER_LIFETIME_MS);

    if (targets.length < MAX_TARGETS && now - this.lastSpawnAt >= SPAWN_INTERVAL_MS) {
      this.lastSpawnAt = now;
      targets = [...targets, this.spawnTarget(width, height, now)];
      this.onSound?.('spawn');
    }

    this.state = { ...this.state, targets, tracers };
    this.onStateChange(this.state);
  }

  /** Processes hand gesture input and triggers shooting. */
  input(hands: HandObservation[], width: number, height: number, now: number = this.now()): void {
    if (!this.state.running) return;

    const aims: AimState[] = [];
    let { score, shots, hits, targets } = this.state;
    const { tracers } = this.state;
    const newTracers: Tracer[] = [];

    for (const hand of hands) {
      const armed = isPistolPose(hand.landmarks);
      const rawAim = armed ? aimFromHand(hand.landmarks, width, height) : null;
      // Mirror once (the game layer opts out of the CSS mirror), then smooth,
      // so the filters track the coordinates actually drawn on screen.
      const aim = rawAim ? this.smoothAim(hand.handedness, mirrorAim(rawAim, width), now) : this.resetCursor(hand.handedness);
      aims.push({ handedness: hand.handedness, armed, aim });

      const tracker = this.trackerFor(hand.handedness);
      // A non-pistol hand must not accumulate trigger state, or lowering the
      // thumb while simply resting the hand would fire the moment it re-arms.
      const pulled = armed ? tracker.update(triggerDistance(hand.landmarks), now) : this.resetTrigger(hand.handedness);

      const justPulled = pulled && this.wasPulled.get(hand.handedness) !== true;
      this.wasPulled.set(hand.handedness, pulled);

      if (!justPulled || !aim) continue;

      shots++;
      this.onSound?.('shoot');
      const struck = nearestHit(aim.cursor, targets);
      if (struck) {
        hits++;
        score += 100;
        targets = targets.filter((target) => target.id !== struck.id);
        this.onSound?.('hit');
      } else {
        this.onSound?.('miss');
      }
      // The tracer always ends at the cursor: the shot lands where you aimed,
      // hit or miss, so a miss reads as "I was off target" rather than as a
      // shot flying off in some unrelated direction.
      newTracers.push({ from: aim.muzzle, to: aim.cursor, firedAt: now, hit: struck !== null });
    }

    this.state = { ...this.state, score, shots, hits, targets, tracers: [...tracers, ...newTracers], aims };
    this.onStateChange(this.state);
  }

  /** Per camera frame convenience: simulation tick + gesture input. */
  frame(hands: HandObservation[], width: number, height: number): void {
    if (!this.state.running) return;
    const now = this.now();
    this.tick(now, width, height);
    this.input(hands, width, height, now);
  }

  /** Smooths the cursor per hand, so landmark jitter does not shake the crosshair. */
  private smoothAim(handedness: Handedness, aim: Aim, now: number): Aim {
    let filters = this.cursorFilters.get(handedness);
    if (!filters) {
      filters = {
        x: new OneEuroFilter(CURSOR_MIN_CUTOFF, CURSOR_BETA, CURSOR_D_CUTOFF),
        y: new OneEuroFilter(CURSOR_MIN_CUTOFF, CURSOR_BETA, CURSOR_D_CUTOFF),
      };
      this.cursorFilters.set(handedness, filters);
    }
    return {
      cursor: { x: filters.x.filter(aim.cursor.x, now), y: filters.y.filter(aim.cursor.y, now) },
      muzzle: aim.muzzle,
    };
  }

  /** Drops smoothing history when the hand stops aiming, so re-arming snaps to
   *  the finger instead of sliding in from the last known position. */
  private resetCursor(handedness: Handedness): null {
    const filters = this.cursorFilters.get(handedness);
    filters?.x.reset();
    filters?.y.reset();
    return null;
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

/** Closest target under the cursor, so overlapping targets resolve nearest-first. */
function nearestHit(cursor: Point, targets: Target[]): Target | null {
  let best: { target: Target; distance: number } | null = null;

  for (const target of targets) {
    if (!pointInCircle(cursor, target.center, target.radius)) continue;
    const distance = Math.hypot(cursor.x - target.center.x, cursor.y - target.center.y);
    if (!best || distance < best.distance) {
      best = { target, distance };
    }
  }
  return best?.target ?? null;
}
