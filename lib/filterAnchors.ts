import type { NormalizedLandmark, Point } from '../types';

/** Center/length/angle of a landmark pair projected into canvas pixel space —
 *  the position+scale+rotation triple every landmark-anchored filter needs. */
export interface AnchorTransform {
  center: Point;
  length: number;
  angleRad: number;
}

/** Projects a normalized landmark into canvas pixel space. */
export function toPx(lm: NormalizedLandmark, width: number, height: number): Point {
  return { x: lm.x * width, y: lm.y * height };
}

/**
 * Transform of the segment a→b in pixel space. Filters draw in a local frame
 * (translate to center, rotate by angle, scale by length) so they follow the
 * face/hand position, distance to camera, and tilt for free.
 */
export function segmentTransform(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  width: number,
  height: number,
): AnchorTransform {
  const ap = toPx(a, width, height);
  const bp = toPx(b, width, height);
  return {
    center: { x: (ap.x + bp.x) / 2, y: (ap.y + bp.y) / 2 },
    length: Math.hypot(bp.x - ap.x, bp.y - ap.y),
    angleRad: Math.atan2(bp.y - ap.y, bp.x - ap.x),
  };
}
