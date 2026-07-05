import { describe, expect, it } from 'vitest';
import { replayFixture } from './replay';
import type { RecordedFixture, RecordedFrame } from '../lib/fixtures';
import type { RawHandFrame } from '../engine/handEngine';
import { LM } from '../lib/landmarks';
import type { NormalizedLandmark } from '../types';

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 100;
const FRAME_INTERVAL_MS = 33;

/** Pinched: thumb/index tips ~0.01 apart (relative to a hand size of 1) — deep inside the pinch threshold. */
function pinchedAt(thumbX: number): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.WRIST] = { x: 0, y: 0, z: 0 };
  landmarks[LM.MIDDLE_MCP] = { x: 0, y: 1, z: 0 }; // handSize = 1
  landmarks[LM.THUMB_TIP] = { x: thumbX, y: 0, z: 0 };
  landmarks[LM.INDEX_TIP] = { x: thumbX + 0.01, y: 0, z: 0 };
  return landmarks;
}

/** Open: thumb/index tips far apart — well past the release threshold. */
function openAt(thumbX: number): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.WRIST] = { x: 0, y: 0, z: 0 };
  landmarks[LM.MIDDLE_MCP] = { x: 0, y: 1, z: 0 };
  landmarks[LM.THUMB_TIP] = { x: thumbX, y: 0, z: 0 };
  landmarks[LM.INDEX_TIP] = { x: thumbX, y: 1, z: 0 };
  return landmarks;
}

function rightHand(landmarks: NormalizedLandmark[]): RawHandFrame[] {
  return [{ handedness: 'Right', landmarks }];
}

/**
 * A synthetic fixture built frame-by-frame (not a real recording) that
 * exercises the FULL pipeline `replayFixture` drives: PinchTracker's own
 * confirm/release debounce, the OneEuroFilter pointer smoothing, and the
 * BBT relabel-grace mechanics — the same code path a real recorded session
 * would replay through. This is what proves `features/replay.ts` actually
 * wires HandRecognizer + GestureEventDispatcher + BBTSessionController
 * together correctly; the individual pieces already have their own unit
 * tests (`lib/recognition.test.ts`, `features/bbtSession.test.ts`).
 */
function buildValidTransferFixture(): RecordedFixture {
  const frames: RecordedFrame[] = [];
  let t = 0;
  const push = (hands: RawHandFrame[]) => {
    frames.push({ tMs: t, hands });
    t += FRAME_INTERVAL_MS;
  };

  for (let i = 0; i < 6; i++) push(rightHand(pinchedAt(0.1))); // hold still — clears the ~150ms pinch-confirm debounce
  for (const x of [0.3, 0.5, 0.7, 0.9]) push(rightHand(pinchedAt(x))); // carry across the x=0.5 (canvas x=100) midline
  for (let i = 0; i < 8; i++) push(rightHand(openAt(0.9))); // release, hold open past the release debounce
  push([]); // hand leaves the frame entirely — guarantees the gesture-end edge fires even if debounce hadn't cleared
  t += 300; // advance past RELABEL_GRACE_MS (250ms)
  push([]); // this frame's controller.frame() call finalizes the pending rep before stop()

  return {
    meta: {
      recordedAt: 0,
      durationMs: t,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      note: 'synthetic smoke-test fixture, not a real recording',
    },
    frames,
  };
}

describe('replayFixture', () => {
  it('replays a synthetic valid transfer through the real recognition pipeline', () => {
    const fixture = buildValidTransferFixture();
    const result = replayFixture(fixture, { selectedHand: 'Right' });

    expect(result.finalBlockCount).toBe(1);
    expect(result.summary.selectedHand).toBe('Right');
    expect(result.summary.reps[0]?.smoothness).toBeGreaterThan(0);
  });

  it('does not count a transfer for a hand that was never selected', () => {
    const fixture = buildValidTransferFixture();
    const result = replayFixture(fixture, { selectedHand: 'Left' });

    expect(result.finalBlockCount).toBe(0);
  });
});
