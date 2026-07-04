import { distPx } from '../lib/geometry';
import type { HandObservation, Handedness } from '../lib/recognition';
import type { Point } from '../types';

/** Below this accumulated path length, a pinch-release is treated as jitter, not a real transfer. */
const MIN_TRANSFER_PATH_PX = 40;

/**
 * How long we tolerate the tracked hand's gesture dropping out (MediaPipe
 * handedness relabel, brief occlusion) before treating the rep as abandoned.
 * Mirrors the PinchTracker debounce precedent (lib/filters.ts) for the same
 * reason: the underlying classifier is noisy, not necessarily the user's intent.
 */
const RELABEL_GRACE_MS = 250;

/**
 * How close a resumed hand's pointer must be to the rep's last known point to
 * be accepted as the SAME physical hand relabeled, rather than a different
 * hand starting an unrelated pinch elsewhere in frame. Flat px, not relative
 * to hand size — this is a screen-space continuity check, not a touch
 * threshold (same reasoning as MIN_TRANSFER_PATH_PX above).
 */
const RESUME_PROXIMITY_PX = 120;

const DEFAULT_SESSION_MS = 60_000;

/** The one gesture id this feature reacts to. */
const TRANSFER_GESTURE_ID = 'thumb-index';

export interface BBTRep {
  durationMs: number;
  pathLengthPx: number;
  straightLineDistPx: number;
  /** straightLineDist / pathLength, clamped to [0, 1]. 1 = perfectly straight, lower = more wobble. */
  smoothness: number;
  speedPxPerSec: number;
  completedAt: number;
}

export interface BBTSessionSummary {
  selectedHand: Handedness;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  reps: BBTRep[];
  blockCount: number;
  avgDurationMs: number;
  avgSmoothness: number;
  avgSpeedPxPerSec: number;
}

export interface BBTSessionState {
  running: boolean;
  selectedHand: Handedness | null;
  remainingMs: number;
  blockCount: number;
  lastRep: BBTRep | null;
  reps: BBTRep[];
}

/** Diagnostic-only snapshot of the in-progress rep, if any — for the debug overlay. */
export interface BBTDebugSnapshot {
  trackedHandedness: Handedness | null;
  /** ms since the tracked hand's gesture ended, if it's currently in the relabel-grace window. */
  pendingForMs: number | null;
  candidateHandedness: Handedness | null;
  pathLengthPx: number;
}

const INITIAL_STATE: BBTSessionState = {
  running: false,
  selectedHand: null,
  remainingMs: 0,
  blockCount: 0,
  lastRep: null,
  reps: [],
};

interface ActiveRep {
  startTime: number;
  startPoint: Point | null;
  lastPoint: Point | null;
  pathLengthPx: number;
  /** Set the moment the tracked hand's gesture ends; cleared if it resumes
   *  (same hand, or a plausible relabel) within RELABEL_GRACE_MS. */
  pendingSince: number | null;
  /** A different-labeled hand's gesture started while this rep was pending —
   *  candidate to adopt as a continuation, confirmed by proximity in frame(). */
  candidateHandedness: Handedness | null;
}

type Compartment = 'A' | 'B';

function compartmentOf(x: number, partitionX: number): Compartment {
  return x < partitionX ? 'A' : 'B';
}

/**
 * Framework-agnostic Box-and-Block-Test session tracker.
 *
 * Tracks exactly ONE hand per session (the real clinical BBT protocol tests
 * one hand at a time, never both together): `start(selectedHand)` fixes which
 * hand's gestures count, and any other hand is ignored outright. A rep is
 * counted when a `thumb-index` pinch on the selected hand starts on one side
 * of the canvas midline and releases on the other.
 *
 * MediaPipe's handedness label can flicker (a brief relabel, not a real
 * release), so ending a rep is a two-step process: the tracked hand's
 * gesture-end marks it "pending"; if a plausible resumption (same or
 * relabeled hand, close to the last known point) shows up within
 * RELABEL_GRACE_MS, the rep continues uninterrupted, otherwise it finalizes
 * with whatever data it had at the moment it went pending.
 *
 * A separate UI-rate `tick()` (not the camera loop) drives the countdown so
 * timing never depends on camera framerate.
 */
export class BBTSessionController {
  private state: BBTSessionState = { ...INITIAL_STATE };
  private active: ActiveRep | null = null;
  private trackedHandedness: Handedness | null = null;
  private startedAt = 0;
  private durationMs = DEFAULT_SESSION_MS;
  private lastSummary: BBTSessionSummary | null = null;

  constructor(
    private readonly getCanvasWidth: () => number,
    private readonly onStateChange: (state: BBTSessionState) => void,
  ) {}

  getState(): BBTSessionState {
    return this.state;
  }

  getLastSummary(): BBTSessionSummary | null {
    return this.lastSummary;
  }

  /** Diagnostic-only — for the debug overlay, not used by the counting logic itself. */
  getDebugSnapshot(): BBTDebugSnapshot | null {
    if (!this.active) return null;
    return {
      trackedHandedness: this.trackedHandedness,
      pendingForMs: this.active.pendingSince === null ? null : Date.now() - this.active.pendingSince,
      candidateHandedness: this.active.candidateHandedness,
      pathLengthPx: this.active.pathLengthPx,
    };
  }

  start(selectedHand: Handedness, durationMs: number = DEFAULT_SESSION_MS): void {
    this.durationMs = durationMs;
    this.startedAt = Date.now();
    this.active = null;
    this.trackedHandedness = selectedHand;
    this.state = { ...INITIAL_STATE, running: true, selectedHand, remainingMs: durationMs };
    this.onStateChange(this.state);
  }

  stop(): BBTSessionSummary {
    const summary = this.buildSummary(Date.now());
    this.lastSummary = summary;
    this.active = null;
    this.trackedHandedness = null;
    this.state = { ...this.state, running: false, remainingMs: 0 };
    this.onStateChange(this.state);
    return summary;
  }

  /** Call from a UI-rate timer (e.g. every 250ms) — independent of the MediaPipe frame loop. */
  tick(): void {
    if (!this.state.running) return;
    this.finalizeIfGraceExpired();

    const remainingMs = Math.max(0, this.durationMs - (Date.now() - this.startedAt));
    if (remainingMs <= 0) {
      this.stop();
      return;
    }
    this.state = { ...this.state, remainingMs };
    this.onStateChange(this.state);
  }

  handleGestureStart(handedness: Handedness, gestureId: string): void {
    if (gestureId !== TRANSFER_GESTURE_ID || !this.state.running || !this.state.selectedHand) return;

    if (!this.active) {
      if (handedness !== this.state.selectedHand) return; // not the hand this trial is for
      this.trackedHandedness = handedness;
      this.active = { startTime: Date.now(), startPoint: null, lastPoint: null, pathLengthPx: 0, pendingSince: null, candidateHandedness: null };
      return;
    }

    if (this.active.pendingSince === null) return; // rep actively tracked; ignore any other hand's start
    this.active.candidateHandedness = handedness;
  }

  handleGestureEnd(handedness: Handedness, gestureId: string): void {
    if (gestureId !== TRANSFER_GESTURE_ID || !this.active) return;
    if (handedness !== this.trackedHandedness) return; // not the hand we're tracking
    this.active.pendingSince = Date.now();
  }

  /** Per-frame: extend the in-progress path, or resolve a pending relabel-candidate. */
  frame(hands: HandObservation[]): void {
    this.finalizeIfGraceExpired();
    if (!this.active) return;

    if (this.active.pendingSince !== null) {
      this.tryResumeFromCandidate(hands);
      return;
    }

    const hand = hands.find((h) => h.handedness === this.trackedHandedness);
    if (!hand) return;
    if (this.active.startPoint === null) {
      this.active.startPoint = hand.pointer;
    } else if (this.active.lastPoint) {
      this.active.pathLengthPx += distPx(this.active.lastPoint, hand.pointer);
    }
    this.active.lastPoint = hand.pointer;
  }

  /** Triggers a JSON file download of the most recently completed session, if any. */
  exportJson(): void {
    if (!this.lastSummary) return;
    const blob = new Blob([JSON.stringify(this.lastSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bbt-session-${this.lastSummary.selectedHand}-${this.lastSummary.endedAt}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private tryResumeFromCandidate(hands: HandObservation[]): void {
    const rep = this.active;
    if (!rep || !rep.candidateHandedness || !rep.lastPoint) return;
    const candidate = hands.find((h) => h.handedness === rep.candidateHandedness);
    if (!candidate) return;

    if (distPx(candidate.pointer, rep.lastPoint) > RESUME_PROXIMITY_PX) {
      rep.candidateHandedness = null; // too far to plausibly be the same hand — keep waiting
      return;
    }

    this.trackedHandedness = rep.candidateHandedness;
    rep.pendingSince = null;
    rep.candidateHandedness = null;
    rep.lastPoint = candidate.pointer;
  }

  private finalizeIfGraceExpired(): void {
    const rep = this.active;
    if (rep && rep.pendingSince !== null && Date.now() - rep.pendingSince >= RELABEL_GRACE_MS) {
      this.finalizeActive(rep);
    }
  }

  private finalizeActive(rep: ActiveRep): void {
    this.active = null;
    if (!rep.startPoint || !rep.lastPoint) return;
    if (rep.pathLengthPx < MIN_TRANSFER_PATH_PX) return;

    const partitionX = this.getCanvasWidth() / 2;
    if (compartmentOf(rep.startPoint.x, partitionX) === compartmentOf(rep.lastPoint.x, partitionX)) return;

    const durationMs = Date.now() - rep.startTime;
    const straightLineDistPx = distPx(rep.startPoint, rep.lastPoint);
    const completed: BBTRep = {
      durationMs,
      pathLengthPx: rep.pathLengthPx,
      straightLineDistPx,
      smoothness: rep.pathLengthPx > 0 ? Math.min(1, straightLineDistPx / rep.pathLengthPx) : 0,
      speedPxPerSec: durationMs > 0 ? (rep.pathLengthPx / durationMs) * 1000 : 0,
      completedAt: Date.now(),
    };

    this.state = {
      ...this.state,
      blockCount: this.state.blockCount + 1,
      lastRep: completed,
      reps: [...this.state.reps, completed],
    };
    this.onStateChange(this.state);
  }

  private buildSummary(endedAt: number): BBTSessionSummary {
    const { reps, selectedHand } = this.state;
    const avg = (pick: (rep: BBTRep) => number): number =>
      reps.length === 0 ? 0 : reps.reduce((sum, rep) => sum + pick(rep), 0) / reps.length;

    return {
      selectedHand: selectedHand ?? 'Right',
      startedAt: this.startedAt,
      endedAt,
      durationMs: this.durationMs,
      reps,
      blockCount: reps.length,
      avgDurationMs: avg((rep) => rep.durationMs),
      avgSmoothness: avg((rep) => rep.smoothness),
      avgSpeedPxPerSec: avg((rep) => rep.speedPxPerSec),
    };
  }
}
