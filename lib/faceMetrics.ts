import type { NormalizedLandmark } from '../types';
import { dist } from './geometry';
import { FL } from './faceLandmarks';

/**
 * Scale-invariant facial metrics derived from raw Face Mesh landmarks.
 * All ratios are normalized by a same-face reference distance (the repo's
 * standing rule for gesture thresholds — see .agents/AGENTS.md), so they hold
 * whether the face is 30 cm or 2 m from the camera.
 */
export interface FaceMetrics {
  /** Per-eye openness: lid gap / eye width. ~0.25-0.4 open, < ~0.12 closed. */
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  /** Inner-lip gap / mouth width. ~0 closed, > ~0.5 wide open. */
  mouthOpenRatio: number;
  /** Mouth width / temple-to-temple face width. Rises when smiling (~0.35 neutral, ~0.45+ smile). */
  smileRatio: number;
  /** Head roll in degrees: 0 = level, positive = subject's head tilted toward their LEFT shoulder. */
  headRollDeg: number;
}

/** Below this eye-openness ratio, the lid gap reads as a blink/closed eye. */
export const EYE_CLOSED_THRESHOLD = 0.12;

function ratio(numerator: number, denominator: number): number {
  return denominator > 1e-6 ? numerator / denominator : 0;
}

/** Returns null when any required landmark is missing (partial detection). */
export function computeFaceMetrics(landmarks: NormalizedLandmark[]): FaceMetrics | null {
  const required = [
    FL.RIGHT_EYE_OUTER, FL.RIGHT_EYE_INNER, FL.RIGHT_EYE_UPPER, FL.RIGHT_EYE_LOWER,
    FL.LEFT_EYE_OUTER, FL.LEFT_EYE_INNER, FL.LEFT_EYE_UPPER, FL.LEFT_EYE_LOWER,
    FL.MOUTH_CORNER_RIGHT, FL.MOUTH_CORNER_LEFT, FL.LIP_UPPER_INNER, FL.LIP_LOWER_INNER,
    FL.TEMPLE_RIGHT, FL.TEMPLE_LEFT,
  ];
  if (required.some((i) => landmarks[i] === undefined)) return null;

  const lm = (i: number): NormalizedLandmark => landmarks[i]!;

  const rightEyeOpenness = ratio(
    dist(lm(FL.RIGHT_EYE_UPPER), lm(FL.RIGHT_EYE_LOWER)),
    dist(lm(FL.RIGHT_EYE_OUTER), lm(FL.RIGHT_EYE_INNER)),
  );
  const leftEyeOpenness = ratio(
    dist(lm(FL.LEFT_EYE_UPPER), lm(FL.LEFT_EYE_LOWER)),
    dist(lm(FL.LEFT_EYE_OUTER), lm(FL.LEFT_EYE_INNER)),
  );

  const mouthWidth = dist(lm(FL.MOUTH_CORNER_RIGHT), lm(FL.MOUTH_CORNER_LEFT));
  const mouthOpenRatio = ratio(dist(lm(FL.LIP_UPPER_INNER), lm(FL.LIP_LOWER_INNER)), mouthWidth);
  const smileRatio = ratio(mouthWidth, dist(lm(FL.TEMPLE_RIGHT), lm(FL.TEMPLE_LEFT)));

  // Roll from the inter-eye line (subject's right eye → left eye). In image
  // space +y is down, so a positive angle means the left eye sits lower.
  const right = lm(FL.RIGHT_EYE_OUTER);
  const left = lm(FL.LEFT_EYE_OUTER);
  const headRollDeg = (Math.atan2(left.y - right.y, left.x - right.x) * 180) / Math.PI;

  return { leftEyeOpenness, rightEyeOpenness, mouthOpenRatio, smileRatio, headRollDeg };
}
