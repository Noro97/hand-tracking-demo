import type { NormalizedLandmark, Point } from '../types';
import {
  ONE_EURO_BETA,
  ONE_EURO_D_CUTOFF,
  ONE_EURO_MIN_CUTOFF,
  OneEuroFilter,
  PinchTracker,
} from './filters';
import { GESTURES, type GestureDef } from './gestures';
import { dist, handSize, midpointPx } from './geometry';
import { LM } from './landmarks';

export type Handedness = 'Left' | 'Right';

/**
 * Detections whose MediaPipe handedness-classification score falls below this
 * are rejected outright. Face/beard textures occasionally false-positive as a
 * "hand" (observed live: a hand skeleton locked onto the user's mouth and even
 * confirmed a pinch); those detections tend to score noticeably lower than
 * real hands (~0.95+). Tunable: raise if face-hands persist, lower if real
 * hands in poor lighting start being dropped.
 */
export const MIN_HANDEDNESS_SCORE = 0.8;

export interface HandObservation {
  handedness: Handedness;
  /** MediaPipe's confidence in the Left/Right classification — diagnostic, shown in the debug panel. */
  handednessScore: number;
  /** Smoothed pointer (thumb/index midpoint) in canvas pixel space. */
  pointer: Point;
  /** Active state per gesture id. */
  gestures: Record<string, boolean>;
  /** Raw hand-size-normalized distance per gesture id, before hysteresis/debounce — diagnostic only. */
  gestureDistances: Record<string, number>;
  /** Raw landmarks, passed through for rendering. */
  landmarks: NormalizedLandmark[];
}

interface HandTrackers {
  filterX: OneEuroFilter;
  filterY: OneEuroFilter;
  gestures: Map<string, PinchTracker>;
}

/**
 * Stateful recognizer. Each hand (keyed by handedness) owns its own smoothing
 * filters and one tracker per gesture, so two hands never share state. Trackers
 * are created lazily and reset when a hand leaves the frame.
 */
export class HandRecognizer {
  private readonly perHand = new Map<Handedness, HandTrackers>();

  private ensure(handedness: Handedness): HandTrackers {
    let trackers = this.perHand.get(handedness);
    if (!trackers) {
      trackers = {
        filterX: new OneEuroFilter(ONE_EURO_MIN_CUTOFF, ONE_EURO_BETA, ONE_EURO_D_CUTOFF),
        filterY: new OneEuroFilter(ONE_EURO_MIN_CUTOFF, ONE_EURO_BETA, ONE_EURO_D_CUTOFF),
        gestures: new Map(GESTURES.map((g) => [g.id, this.makeTracker(g)])),
      };
      this.perHand.set(handedness, trackers);
    }
    return trackers;
  }

  private makeTracker(g: GestureDef): PinchTracker {
    return new PinchTracker(g.enterRel, g.exitRel, g.debounceMs);
  }

  recognize(
    handedness: Handedness,
    landmarks: NormalizedLandmark[],
    canvasWidth: number,
    canvasHeight: number,
    now: number,
    handednessScore = 1,
  ): HandObservation | null {
    // Gate lives HERE (not in the engine) so headless replay applies the exact
    // same rejection logic as the live pipeline — the task-017 no-drift rule.
    if (handednessScore < MIN_HANDEDNESS_SCORE) return null;

    const thumbTip = landmarks[LM.THUMB_TIP];
    const indexTip = landmarks[LM.INDEX_TIP];
    if (!thumbTip || !indexTip) return null;

    const trackers = this.ensure(handedness);
    const size = handSize(landmarks);

    const gestures: Record<string, boolean> = {};
    const gestureDistances: Record<string, number> = {};
    for (const g of GESTURES) {
      const a = landmarks[g.fingerA];
      const b = landmarks[g.fingerB];
      const tracker = trackers.gestures.get(g.id);
      if (!a || !b || !tracker) {
        gestures[g.id] = false;
        continue;
      }
      const rel = size > 1e-6 ? dist(a, b) / size : dist(a, b);
      gestureDistances[g.id] = rel;
      gestures[g.id] = tracker.update(rel, now);
    }

    const raw = midpointPx(thumbTip, indexTip, canvasWidth, canvasHeight);
    const pointer: Point = {
      x: trackers.filterX.filter(raw.x, now),
      y: trackers.filterY.filter(raw.y, now),
    };

    return { handedness, handednessScore, pointer, gestures, gestureDistances, landmarks };
  }

  /** Reset filters/trackers for hands not seen in the current frame. */
  retainOnly(present: Set<Handedness>): void {
    for (const [handedness, trackers] of this.perHand) {
      if (present.has(handedness)) continue;
      trackers.filterX.reset();
      trackers.filterY.reset();
      for (const tracker of trackers.gestures.values()) tracker.reset();
    }
  }
}
