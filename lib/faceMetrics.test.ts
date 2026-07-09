import { describe, expect, it } from 'vitest';
import { computeFaceMetrics, EYE_CLOSED_THRESHOLD } from './faceMetrics';
import { FL } from './faceLandmarks';
import type { NormalizedLandmark } from '../types';

function lm(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0 };
}

/**
 * A sparse synthetic face: only the indices computeFaceMetrics reads.
 * Geometry is laid out on a level (no-roll) face, 0.5 wide between temples.
 */
function makeFace(overrides: Partial<Record<number, NormalizedLandmark>> = {}): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  // Right eye: 0.1 wide, lids 0.03 apart (openness 0.3)
  landmarks[FL.RIGHT_EYE_OUTER] = lm(0.3, 0.4);
  landmarks[FL.RIGHT_EYE_INNER] = lm(0.4, 0.4);
  landmarks[FL.RIGHT_EYE_UPPER] = lm(0.35, 0.385);
  landmarks[FL.RIGHT_EYE_LOWER] = lm(0.35, 0.415);
  // Left eye: same shape, mirrored
  landmarks[FL.LEFT_EYE_INNER] = lm(0.6, 0.4);
  landmarks[FL.LEFT_EYE_OUTER] = lm(0.7, 0.4);
  landmarks[FL.LEFT_EYE_UPPER] = lm(0.65, 0.385);
  landmarks[FL.LEFT_EYE_LOWER] = lm(0.65, 0.415);
  // Mouth: 0.2 wide, closed (inner lips touching)
  landmarks[FL.MOUTH_CORNER_RIGHT] = lm(0.4, 0.7);
  landmarks[FL.MOUTH_CORNER_LEFT] = lm(0.6, 0.7);
  landmarks[FL.LIP_UPPER_INNER] = lm(0.5, 0.7);
  landmarks[FL.LIP_LOWER_INNER] = lm(0.5, 0.7);
  // Temples: 0.5 apart
  landmarks[FL.TEMPLE_RIGHT] = lm(0.25, 0.45);
  landmarks[FL.TEMPLE_LEFT] = lm(0.75, 0.45);
  for (const [index, value] of Object.entries(overrides)) {
    if (value) landmarks[Number(index)] = value;
  }
  return landmarks;
}

describe('computeFaceMetrics', () => {
  it('returns null when a required landmark is missing', () => {
    expect(computeFaceMetrics([])).toBeNull();
  });

  it('computes eye openness as lid gap over eye width', () => {
    const metrics = computeFaceMetrics(makeFace());
    expect(metrics?.rightEyeOpenness).toBeCloseTo(0.3);
    expect(metrics?.leftEyeOpenness).toBeCloseTo(0.3);
    expect(metrics!.rightEyeOpenness).toBeGreaterThan(EYE_CLOSED_THRESHOLD);
  });

  it('reads a closed eye below the blink threshold', () => {
    const metrics = computeFaceMetrics(
      makeFace({
        [FL.RIGHT_EYE_UPPER]: lm(0.35, 0.399),
        [FL.RIGHT_EYE_LOWER]: lm(0.35, 0.401), // lid gap 0.002 over width 0.1 → 0.02
      }),
    );
    expect(metrics!.rightEyeOpenness).toBeLessThan(EYE_CLOSED_THRESHOLD);
    expect(metrics!.leftEyeOpenness).toBeCloseTo(0.3); // other eye unaffected
  });

  it('mouth open ratio is 0 when closed and rises with the inner-lip gap', () => {
    expect(computeFaceMetrics(makeFace())?.mouthOpenRatio).toBeCloseTo(0);

    const open = computeFaceMetrics(
      makeFace({
        [FL.LIP_UPPER_INNER]: lm(0.5, 0.68),
        [FL.LIP_LOWER_INNER]: lm(0.5, 0.76), // gap 0.08 over width 0.2 → 0.4
      }),
    );
    expect(open?.mouthOpenRatio).toBeCloseTo(0.4);
  });

  it('smile ratio is mouth width over face width', () => {
    expect(computeFaceMetrics(makeFace())?.smileRatio).toBeCloseTo(0.2 / 0.5);
  });

  it('head roll is 0 for a level face and positive when the left eye sits lower', () => {
    expect(computeFaceMetrics(makeFace())?.headRollDeg).toBeCloseTo(0);

    const tilted = computeFaceMetrics(
      makeFace({
        [FL.LEFT_EYE_OUTER]: lm(0.7, 0.5), // dropped 0.1 below the right eye over dx 0.4
      }),
    );
    expect(tilted?.headRollDeg).toBeCloseTo((Math.atan2(0.1, 0.4) * 180) / Math.PI);
  });
});
