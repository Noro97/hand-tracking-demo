import { describe, expect, it } from 'vitest';
import {
  areOtherFingersCurled,
  isIndexExtended,
  isPistolPose,
  triggerDistance,
  TRIGGER_ENTER_REL,
} from './pistolPose';
import { LM } from './landmarks';
import type { NormalizedLandmark } from '../types';

function lm(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0 };
}

/**
 * Builds a hand with the wrist at the origin and fingers pointing up (-y).
 * `reach` per finger is the tip's distance from the wrist; the PIP sits at a
 * fixed 0.2, so reach > 0.2 reads as extended and reach < 0.2 as curled.
 */
function makeHand(options: {
  index: number;
  middle: number;
  ring: number;
  pinky: number;
  thumbDistance?: number;
}): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.WRIST] = lm(0, 0);
  landmarks[LM.MIDDLE_MCP] = lm(0, -0.25); // handSize reference = 0.25
  landmarks[LM.INDEX_MCP] = lm(0.05, -0.1); // trigger + aim origin

  // Extension only reads tip and pip, so the remaining knuckles are irrelevant here.
  const finger = (pip: number, tip: number, x: number, reach: number) => {
    landmarks[pip] = lm(x, -0.2);
    landmarks[tip] = lm(x, -reach);
  };
  finger(LM.INDEX_PIP, LM.INDEX_TIP, 0.05, options.index);
  finger(LM.MIDDLE_PIP, LM.MIDDLE_TIP, 0.0, options.middle);
  finger(LM.RING_PIP, LM.RING_TIP, -0.05, options.ring);
  finger(LM.PINKY_PIP, LM.PINKY_TIP, -0.1, options.pinky);

  // Thumb placed at the requested distance from the index knuckle (0.05, -0.1).
  const d = options.thumbDistance ?? 0.3;
  landmarks[LM.THUMB_TIP] = lm(0.05 + d, -0.1);
  return landmarks;
}

const PISTOL = { index: 0.35, middle: 0.15, ring: 0.15, pinky: 0.15 };

describe('finger extension', () => {
  it('reads a reaching index finger as extended', () => {
    expect(isIndexExtended(makeHand(PISTOL))).toBe(true);
  });

  it('reads a curled index finger as not extended', () => {
    expect(isIndexExtended(makeHand({ ...PISTOL, index: 0.15 }))).toBe(false);
  });

  it('reads the other three fingers as curled only when all three are', () => {
    expect(areOtherFingersCurled(makeHand(PISTOL))).toBe(true);
    expect(areOtherFingersCurled(makeHand({ ...PISTOL, ring: 0.35 }))).toBe(false);
  });

  it('treats missing landmarks as not-extended rather than throwing', () => {
    expect(isIndexExtended([])).toBe(false);
    expect(areOtherFingersCurled([])).toBe(false);
  });
});

describe('isPistolPose', () => {
  it('accepts index out with the rest tucked', () => {
    expect(isPistolPose(makeHand(PISTOL))).toBe(true);
  });

  it('rejects an open hand (everything extended)', () => {
    expect(isPistolPose(makeHand({ index: 0.35, middle: 0.35, ring: 0.35, pinky: 0.35 }))).toBe(false);
  });

  it('rejects a closed fist (nothing extended)', () => {
    expect(isPistolPose(makeHand({ index: 0.15, middle: 0.15, ring: 0.15, pinky: 0.15 }))).toBe(false);
  });

  it('rejects a peace sign (index AND middle extended)', () => {
    expect(isPistolPose(makeHand({ ...PISTOL, middle: 0.35 }))).toBe(false);
  });
});

describe('triggerDistance', () => {
  it('is large with the thumb raised and small once it drops to the knuckle', () => {
    const raised = triggerDistance(makeHand({ ...PISTOL, thumbDistance: 0.25 }));
    const dropped = triggerDistance(makeHand({ ...PISTOL, thumbDistance: 0.05 }));
    expect(raised).toBeGreaterThan(TRIGGER_ENTER_REL);
    expect(dropped).toBeLessThan(TRIGGER_ENTER_REL);
  });

  it('is scale-invariant — the same pose at half size gives the same value', () => {
    const full = makeHand({ ...PISTOL, thumbDistance: 0.1 });
    const half = full.map((p) => (p ? lm(p.x / 2, p.y / 2) : p));
    expect(triggerDistance(half)).toBeCloseTo(triggerDistance(full));
  });

  it('returns Infinity for a partial hand so it can never read as a pull', () => {
    expect(triggerDistance([])).toBe(Number.POSITIVE_INFINITY);
  });
});
