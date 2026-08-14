import type { NormalizedLandmark, Point } from '../types';
import { toPx } from './filterAnchors';
import { LM } from './landmarks';

/** A ray in canvas pixel space. `direction` is always unit length. */
export interface Ray {
  origin: Point;
  direction: Point;
}

/**
 * The line the index finger points along, in canvas pixel space: it starts at
 * the fingertip and continues in the knuckle→tip direction, so a tracer drawn
 * along it appears to leave the finger. Returns null if the finger's landmarks
 * are missing or degenerate (tip exactly on the knuckle gives no direction).
 */
export function aimRay(landmarks: NormalizedLandmark[], width: number, height: number): Ray | null {
  const mcp = landmarks[LM.INDEX_MCP];
  const tip = landmarks[LM.INDEX_TIP];
  if (!mcp || !tip) return null;

  const origin = toPx(tip, width, height);
  const from = toPx(mcp, width, height);
  const dx = origin.x - from.x;
  const dy = origin.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;

  return { origin, direction: { x: dx / length, y: dy / length } };
}

/**
 * Distance along `ray` at which it first enters the circle, or null if it
 * misses or the circle lies behind the muzzle. Standard quadratic solve,
 * relying on `direction` being unit length so the `a` coefficient is 1.
 */
export function rayCircleHit(ray: Ray, center: Point, radius: number): number | null {
  const mx = ray.origin.x - center.x;
  const my = ray.origin.y - center.y;

  const b = mx * ray.direction.x + my * ray.direction.y;
  const c = mx * mx + my * my - radius * radius;

  // Pointing away from a circle we're already outside of.
  if (c > 0 && b > 0) return null;

  const discriminant = b * b - c;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const near = -b - root;
  if (near >= 0) return near;

  const far = -b + root;
  return far >= 0 ? far : null;
}

/** The point `distance` along the ray — where a tracer ends, or a hit lands. */
export function pointAlongRay(ray: Ray, distance: number): Point {
  return {
    x: ray.origin.x + ray.direction.x * distance,
    y: ray.origin.y + ray.direction.y * distance,
  };
}
