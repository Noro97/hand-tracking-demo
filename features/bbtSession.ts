import { distPx } from '../lib/geometry';
import type { HandObservation, Handedness } from '../lib/recognition';
import type { Point } from '../types';

/** Below this accumulated path length, a pinch-release is treated as jitter, not a real transfer. */
const MIN_TRANSFER_PATH_PX = 40;

const DEFAULT_SESSION_MS = 60_000;

/** The one gesture id this feature reacts to — reuses the existing pinch, no new gesture definitions. */
const TRANSFER_GESTURE_ID = 'thumb-index';

export interface BBTRep {
  handedness: Handedness;
  durationMs: number;
  pathLengthPx: number;
  straightLineDistPx: number;
  /** straightLineDist / pathLength, clamped to [0, 1]. 1 = perfectly straight, lower = more wobble. */
  smoothness: number;
  speedPxPerSec: number;
  completedAt: number;
}

export interface BBTSessionSummary {
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
  remainingMs: number;
  blockCount: number;
  lastRep: BBTRep | null;
  reps: BBTRep[];
}

const INITIAL_STATE: BBTSessionState = {
  running: false,
  remainingMs: 0,
  blockCount: 0,
  lastRep: null,
  reps: [],
};

interface RepInProgress {
  startTime: number;
  startPoint: Point | null;
  lastPoint: Point | null;
  pathLengthPx: number;
}

type Compartment = 'A' | 'B';

function compartmentOf(x: number, partitionX: number): Compartment {
  return x < partitionX ? 'A' : 'B';
}

/**
 * Framework-agnostic Box-and-Block-Test session tracker, mirroring the shape
 * of {@link InteractionController}: gesture events + a per-frame pointer feed
 * drive rep detection; a separate UI-rate `tick()` (not the camera loop) drives
 * the countdown so timing never depends on camera framerate.
 */
export class BBTSessionController {
  private state: BBTSessionState = { ...INITIAL_STATE };
  private readonly inProgress = new Map<Handedness, RepInProgress>();
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

  start(durationMs: number = DEFAULT_SESSION_MS): void {
    this.durationMs = durationMs;
    this.startedAt = Date.now();
    this.inProgress.clear();
    this.state = { ...INITIAL_STATE, running: true, remainingMs: durationMs };
    this.onStateChange(this.state);
  }

  stop(): BBTSessionSummary {
    const summary = this.buildSummary(Date.now());
    this.lastSummary = summary;
    this.inProgress.clear();
    this.state = { ...this.state, running: false, remainingMs: 0 };
    this.onStateChange(this.state);
    return summary;
  }

  /** Call from a UI-rate timer (e.g. every 250ms) — independent of the MediaPipe frame loop. */
  tick(): void {
    if (!this.state.running) return;
    const remainingMs = Math.max(0, this.durationMs - (Date.now() - this.startedAt));
    if (remainingMs <= 0) {
      this.stop();
      return;
    }
    this.state = { ...this.state, remainingMs };
    this.onStateChange(this.state);
  }

  handleGestureStart(handedness: Handedness, gestureId: string): void {
    if (gestureId !== TRANSFER_GESTURE_ID || !this.state.running) return;
    this.inProgress.set(handedness, {
      startTime: Date.now(),
      startPoint: null,
      lastPoint: null,
      pathLengthPx: 0,
    });
  }

  handleGestureEnd(handedness: Handedness, gestureId: string): void {
    if (gestureId !== TRANSFER_GESTURE_ID) return;
    const rep = this.inProgress.get(handedness);
    this.inProgress.delete(handedness);
    if (!rep || !this.state.running || !rep.startPoint || !rep.lastPoint) return;
    if (rep.pathLengthPx < MIN_TRANSFER_PATH_PX) return;

    const partitionX = this.getCanvasWidth() / 2;
    if (compartmentOf(rep.startPoint.x, partitionX) === compartmentOf(rep.lastPoint.x, partitionX)) return;

    const durationMs = Date.now() - rep.startTime;
    const straightLineDistPx = distPx(rep.startPoint, rep.lastPoint);
    const completed: BBTRep = {
      handedness,
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

  /** Per-frame: extend the in-progress path for any hand currently pinching. Does not trigger React state. */
  frame(hands: HandObservation[]): void {
    for (const hand of hands) {
      const rep = this.inProgress.get(hand.handedness);
      if (!rep) continue;
      if (rep.startPoint === null) {
        rep.startPoint = hand.pointer;
      } else if (rep.lastPoint) {
        rep.pathLengthPx += distPx(rep.lastPoint, hand.pointer);
      }
      rep.lastPoint = hand.pointer;
    }
  }

  /** Triggers a JSON file download of the most recently completed session, if any. */
  exportJson(): void {
    if (!this.lastSummary) return;
    const blob = new Blob([JSON.stringify(this.lastSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bbt-session-${this.lastSummary.endedAt}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private buildSummary(endedAt: number): BBTSessionSummary {
    const { reps } = this.state;
    const avg = (pick: (rep: BBTRep) => number): number =>
      reps.length === 0 ? 0 : reps.reduce((sum, rep) => sum + pick(rep), 0) / reps.length;

    return {
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
