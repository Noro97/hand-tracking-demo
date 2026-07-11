import type { HandObservation } from './recognition';
import { LM } from './landmarks';
import { toPx } from './filterAnchors';
import type { NormalizedLandmark, Point } from '../types';

/** Affine transform coefficients in canvas setTransform(a, b, c, d, e, f) order. */
export interface AffineTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** Quad corners in draw order: top-left, top-right, bottom-right, bottom-left
 *  (subject space — the on-screen mirror flips the whole quad consistently). */
export type QuadCorners = [Point, Point, Point, Point];

/**
 * Solves the affine transform mapping the source triangle onto the destination
 * triangle (three point correspondences → six coefficients). Returns null when
 * the source triangle is degenerate (zero area — the system has no solution).
 */
export function affineFromTriangle(src: [Point, Point, Point], dst: [Point, Point, Point]): AffineTransform | null {
  const [s0, s1, s2] = src;
  const [d0, d1, d2] = dst;

  const det = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (Math.abs(det) < 1e-9) return null;

  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / det;
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / det;
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / det;
  const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / det;
  const e = d0.x - a * s0.x - c * s0.y;
  const f = d0.y - b * s0.x - d * s0.y;

  return { a, b, c, d, e, f };
}

/**
 * The four corners of the "hand-held screen": each hand contributes its index
 * tip (top edge) and thumb tip (bottom edge). Returns null unless BOTH hands
 * are present with the needed landmarks — the screen only exists between two
 * hands.
 */
export function quadFromHands(hands: HandObservation[], width: number, height: number): QuadCorners | null {
  const left = hands.find((h) => h.handedness === 'Left');
  const right = hands.find((h) => h.handedness === 'Right');
  if (!left || !right) return null;

  const corners: Array<NormalizedLandmark | undefined> = [
    left.landmarks[LM.INDEX_TIP],
    right.landmarks[LM.INDEX_TIP],
    right.landmarks[LM.THUMB_TIP],
    left.landmarks[LM.THUMB_TIP],
  ];
  if (corners.some((c) => c === undefined)) return null;

  return corners.map((c) => toPx(c!, width, height)) as QuadCorners;
}

/**
 * Draws `source` stretched onto an arbitrary (convex-ish) quad by splitting it
 * into two triangles and affine-mapping each half — the canvas-2D substitute
 * for projective texture mapping. `sw`/`sh` are the source's pixel size.
 * Each triangle's clip is what bounds the draw; the 0.5px inflation of the
 * shared diagonal hides the seam between the two halves.
 */
export function drawImageInQuad(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  [tl, tr, br, bl]: QuadCorners,
): void {
  const triangles: Array<{ src: [Point, Point, Point]; dst: [Point, Point, Point] }> = [
    { src: [{ x: 0, y: 0 }, { x: sw, y: 0 }, { x: 0, y: sh }], dst: [tl, tr, bl] },
    { src: [{ x: sw, y: 0 }, { x: sw, y: sh }, { x: 0, y: sh }], dst: [tr, br, bl] },
  ];

  for (const { src, dst } of triangles) {
    const t = affineFromTriangle(src, dst);
    if (!t) continue;

    ctx.save();
    ctx.beginPath();
    const cx = (dst[0].x + dst[1].x + dst[2].x) / 3;
    const cy = (dst[0].y + dst[1].y + dst[2].y) / 3;
    for (let i = 0; i < 3; i++) {
      const p = dst[i]!;
      // Inflate each vertex ~0.5px away from the centroid to overlap the seam.
      const dx = p.x - cx;
      const dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const px = p.x + (dx / len) * 0.5;
      const py = p.y + (dy / len) * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
    ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }
}
