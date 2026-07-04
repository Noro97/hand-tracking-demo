import type { NormalizedLandmark, Point } from '../types';
import { LM } from './landmarks';

/** Euclidean distance in the normalized XY plane (ignores depth). */
export function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * A scale reference for the hand: wrist → middle-finger MCP. Normalizing pinch
 * distances by this makes gestures work the same whether the hand is near or far.
 */
export function handSize(landmarks: NormalizedLandmark[]): number {
  const wrist = landmarks[LM.WRIST];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  if (!wrist || !middleMcp) return 0;
  return dist(wrist, middleMcp);
}

/** Midpoint of two landmarks projected into canvas pixel space. */
export function midpointPx(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  width: number,
  height: number,
): Point {
  return {
    x: ((a.x + b.x) / 2) * width,
    y: ((a.y + b.y) / 2) * height,
  };
}
