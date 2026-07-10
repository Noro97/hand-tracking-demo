import { describe, expect, it } from 'vitest';
import { HandRecognizer, MIN_HANDEDNESS_SCORE } from './recognition';
import { LM } from './landmarks';
import type { NormalizedLandmark } from '../types';

/**
 * Builds a minimal 21-slot landmark array with only the four indices
 * `HandRecognizer.recognize` actually reads: WRIST + MIDDLE_MCP (hand-size
 * reference) and THUMB_TIP + INDEX_TIP (the one gesture BBT reacts to).
 * Wrist/middle-MCP are placed 1 unit apart, so `relDist` equals the raw
 * thumb-index distance directly — easy to reason about in assertions.
 */
function makeLandmarks(thumbIndexDist: number): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.WRIST] = { x: 0, y: 0, z: 0 };
  landmarks[LM.MIDDLE_MCP] = { x: 0, y: 1, z: 0 };
  landmarks[LM.THUMB_TIP] = { x: 0, y: 0, z: 0 };
  landmarks[LM.INDEX_TIP] = { x: thumbIndexDist, y: 0, z: 0 };
  return landmarks;
}

describe('HandRecognizer', () => {
  it('does not confirm thumb-index while the fingers stay apart', () => {
    const recognizer = new HandRecognizer();
    const obs = recognizer.recognize('Right', makeLandmarks(0.8), 100, 100, 0);
    expect(obs?.gestures['thumb-index']).toBe(false);
  });

  it('confirms thumb-index once the pinch holds past the debounce window', () => {
    const recognizer = new HandRecognizer();
    recognizer.recognize('Right', makeLandmarks(0.1), 100, 100, 0);
    const obs = recognizer.recognize('Right', makeLandmarks(0.1), 100, 100, 200);
    expect(obs?.gestures['thumb-index']).toBe(true);
  });

  it('returns null when a required landmark is missing', () => {
    const recognizer = new HandRecognizer();
    expect(recognizer.recognize('Right', [], 100, 100, 0)).toBeNull();
  });

  it('rejects a detection below the handedness-score gate (face-as-hand false positive)', () => {
    const recognizer = new HandRecognizer();
    // Regression for the live bug: a "hand" MediaPipe hallucinated on the
    // user's mouth. Its landmarks were perfectly pinch-shaped — only the low
    // classification score gives it away.
    const rejected = recognizer.recognize('Right', makeLandmarks(0.1), 100, 100, 0, MIN_HANDEDNESS_SCORE - 0.01);
    expect(rejected).toBeNull();
  });

  it('accepts a detection at or above the handedness-score gate and defaults to accepting when no score is given', () => {
    const recognizer = new HandRecognizer();
    expect(recognizer.recognize('Right', makeLandmarks(0.8), 100, 100, 0, MIN_HANDEDNESS_SCORE)).not.toBeNull();
    expect(recognizer.recognize('Left', makeLandmarks(0.8), 100, 100, 0)).not.toBeNull();
  });

  it('exposes the score on the observation for the debug panel', () => {
    const recognizer = new HandRecognizer();
    const obs = recognizer.recognize('Right', makeLandmarks(0.8), 100, 100, 0, 0.93);
    expect(obs?.handednessScore).toBe(0.93);
  });

  it('smooths the pointer — a big single-frame jump does not fully pass through', () => {
    const recognizer = new HandRecognizer();
    const first = recognizer.recognize('Right', makeLandmarks(0.5), 100, 100, 0);
    // thumb/index midpoint jumps from x=0.25*100=25 to x=(0+50)/2*100=... construct a jump via a different landmark set
    const jumped: NormalizedLandmark[] = makeLandmarks(0.5);
    jumped[LM.THUMB_TIP] = { x: 1, y: 0, z: 0 };
    jumped[LM.INDEX_TIP] = { x: 1.5, y: 0, z: 0 };
    const second = recognizer.recognize('Right', jumped, 100, 100, 33);

    expect(first?.pointer.x).toBeCloseTo(25);
    // Raw midpoint would be ((1+1.5)/2)*100 = 125; the filtered value should lag behind that.
    expect(second?.pointer.x).toBeLessThan(125);
    expect(second?.pointer.x).toBeGreaterThan(25);
  });

  it('retainOnly resets a hand not present this frame — its next pinch needs a fresh debounce', () => {
    const recognizer = new HandRecognizer();
    recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 0);
    recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 200);
    const confirmed = recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 400);
    expect(confirmed?.gestures['thumb-index']).toBe(true);

    recognizer.retainOnly(new Set()); // 'Left' not present this frame

    // Same instantaneous rel distance, but the tracker was reset — must not
    // still read as confirmed on the very next sample.
    const afterReset = recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 401);
    expect(afterReset?.gestures['thumb-index']).toBe(false);
  });

  it('tracks two hands independently', () => {
    const recognizer = new HandRecognizer();
    recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 0);
    recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 200); // Left confirmed

    const right = recognizer.recognize('Right', makeLandmarks(0.8), 100, 100, 200); // Right apart
    expect(right?.gestures['thumb-index']).toBe(false);

    const left = recognizer.recognize('Left', makeLandmarks(0.1), 100, 100, 200);
    expect(left?.gestures['thumb-index']).toBe(true);
  });
});
