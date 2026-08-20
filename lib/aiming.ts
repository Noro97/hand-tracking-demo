import type { NormalizedLandmark, Point } from '../types';
import { toPx } from './filterAnchors';
import { LM } from './landmarks';

/**
 * Where a pistol hand is aiming.
 *
 * The CURSOR is the fingertip itself, not a point projected along the finger's
 * direction. That is deliberate and is the difference between aiming that
 * works and aiming that doesn't:
 *
 * - Pointing *at the screen* is the natural way to aim, but it is exactly the
 *   case where a projected ray dies: knuckle and tip collapse onto nearly the
 *   same 2D point, so the direction degenerates into noise (or vanishes).
 * - Angular noise at the fingertip is amplified by however far the crosshair
 *   is thrown down the ray. A cursor has no lever arm, so it cannot amplify.
 *
 * The MUZZLE (index knuckle) is kept only so a tracer can be drawn from the
 * hand to the cursor. It never participates in hit detection.
 */
export interface Aim {
  cursor: Point;
  muzzle: Point;
}

export function aimFromHand(landmarks: NormalizedLandmark[], width: number, height: number): Aim | null {
  const tip = landmarks[LM.INDEX_TIP];
  const mcp = landmarks[LM.INDEX_MCP];
  if (!tip || !mcp) return null;

  return { cursor: toPx(tip, width, height), muzzle: toPx(mcp, width, height) };
}

/** Whether the cursor is over a target. Hit detection is this simple by design. */
export function pointInCircle(point: Point, center: Point, radius: number): boolean {
  return Math.hypot(point.x - center.x, point.y - center.y) <= radius;
}

/**
 * Mirrors a point horizontally across a canvas of the given width.
 *
 * Landmarks arrive in un-mirrored camera space, while the video the user sees
 * is CSS-mirrored (`canvas { scaleX(-1) }` in index.html). The game layer opts
 * out of that CSS mirror so its sprites and text render the right way round,
 * which means its coordinates must be mirrored here instead — exactly once.
 */
export function mirrorX(point: Point, width: number): Point {
  return { x: width - point.x, y: point.y };
}

export function mirrorAim(aim: Aim, width: number): Aim {
  return { cursor: mirrorX(aim.cursor, width), muzzle: mirrorX(aim.muzzle, width) };
}
