import type { RawHandFrame } from '../engine/handEngine';

/**
 * The on-disk shape of a recorded (or hand-authored) landmark session. Used
 * on both ends: `hooks/useFrameRecorder.ts` produces it from a real camera
 * session in the browser, `features/replay.ts` consumes it headlessly (no
 * camera, no DOM) to reproduce and regression-test real gesture bugs.
 */
export interface RecordedFrame {
  /** ms since the first frame of the recording — not a wall-clock timestamp, so fixtures are portable. */
  tMs: number;
  hands: RawHandFrame[];
}

export interface RecordedFixture {
  meta: {
    recordedAt: number;
    durationMs: number;
    /** Canvas size the recording used — replay needs this for the same partition-line math. */
    canvasWidth: number;
    canvasHeight: number;
    note?: string;
  };
  frames: RecordedFrame[];
}

export function fixtureFileName(fixture: RecordedFixture): string {
  return `bbt-recording-${fixture.meta.recordedAt}.json`;
}
