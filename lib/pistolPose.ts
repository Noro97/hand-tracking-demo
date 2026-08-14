import type { NormalizedLandmark } from '../types';
import { dist, handSize } from './geometry';
import { LM } from './landmarks';

/**
 * Finger-pose primitives for the pistol gesture: index extended, the other
 * three curled, thumb acting as the hammer.
 *
 * Every measure here is a RATIO of two same-hand distances, so it is
 * scale-invariant by construction — the repo's standing rule for gesture
 * thresholds (see .agents/AGENTS.md), and the reason these work at any
 * distance from the camera.
 */

/** A finger reads as extended above this tip/pip reach ratio. */
export const EXTENDED_RATIO = 1.15;
/** ...and as curled below this one. The gap between the two is deliberate: poses in between count as neither. */
export const CURLED_RATIO = 1.05;

interface FingerChain {
  tip: number;
  pip: number;
}

const INDEX: FingerChain = { tip: LM.INDEX_TIP, pip: LM.INDEX_PIP };
const FOLDED_FINGERS: FingerChain[] = [
  { tip: LM.MIDDLE_TIP, pip: LM.MIDDLE_PIP },
  { tip: LM.RING_TIP, pip: LM.RING_PIP },
  { tip: LM.PINKY_TIP, pip: LM.PINKY_PIP },
];

/**
 * How far the fingertip reaches past its own middle joint, measured from the
 * wrist: >1 means the tip is farther out than the joint (extended), <1 means
 * it has curled back toward the palm. Returns 0 when landmarks are missing.
 */
export function fingerExtensionRatio(landmarks: NormalizedLandmark[], finger: FingerChain): number {
  const wrist = landmarks[LM.WRIST];
  const tip = landmarks[finger.tip];
  const pip = landmarks[finger.pip];
  if (!wrist || !tip || !pip) return 0;

  const pipReach = dist(pip, wrist);
  return pipReach > 1e-6 ? dist(tip, wrist) / pipReach : 0;
}

export function isIndexExtended(landmarks: NormalizedLandmark[]): boolean {
  return fingerExtensionRatio(landmarks, INDEX) > EXTENDED_RATIO;
}

export function areOtherFingersCurled(landmarks: NormalizedLandmark[]): boolean {
  return FOLDED_FINGERS.every((finger) => {
    const ratio = fingerExtensionRatio(landmarks, finger);
    return ratio > 0 && ratio < CURLED_RATIO;
  });
}

/** The pistol shape: index out, middle/ring/pinky tucked into the palm. */
export function isPistolPose(landmarks: NormalizedLandmark[]): boolean {
  return isIndexExtended(landmarks) && areOtherFingersCurled(landmarks);
}

/**
 * Thumb-to-index-knuckle distance over hand size — the "hammer" position.
 * Large with the thumb raised, small once it drops onto the fist, which is
 * what fires the shot. Returns Infinity when landmarks are missing so a
 * partial hand can never read as a trigger pull.
 */
export function triggerDistance(landmarks: NormalizedLandmark[]): number {
  const thumbTip = landmarks[LM.THUMB_TIP];
  const indexMcp = landmarks[LM.INDEX_MCP];
  if (!thumbTip || !indexMcp) return Number.POSITIVE_INFINITY;

  const size = handSize(landmarks);
  return size > 1e-6 ? dist(thumbTip, indexMcp) / size : Number.POSITIVE_INFINITY;
}

/** Hammer-down / hammer-up thresholds, fed through a PinchTracker for hysteresis + debounce. */
export const TRIGGER_ENTER_REL = 0.55;
export const TRIGGER_EXIT_REL = 0.75;
export const TRIGGER_DEBOUNCE_MS = 90;
