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
 *
 * NOTE: corners are ordered by actual canvas x, never by the handedness label.
 * `SWAP_HANDEDNESS` makes "Left" mean "the hand the user sees on screen-left",
 * and because the canvas is CSS-mirrored that hand sits at the LARGER canvas x.
 * Ordering by label therefore wound the quad backwards and mirrored the texture
 * relative to the scene behind it. Sorting geometrically also keeps the quad
 * from self-intersecting when the user crosses their hands.
 */
export function quadFromHands(hands: HandObservation[], width: number, height: number): QuadCorners | null {
  const first = hands.find((h) => h.handedness === 'Left');
  const second = hands.find((h) => h.handedness === 'Right');
  if (!first || !second) return null;

  const tips = (hand: HandObservation): { index: NormalizedLandmark; thumb: NormalizedLandmark } | null => {
    const index = hand.landmarks[LM.INDEX_TIP];
    const thumb = hand.landmarks[LM.THUMB_TIP];
    return index && thumb ? { index, thumb } : null;
  };

  const a = tips(first);
  const b = tips(second);
  if (!a || !b) return null;

  const [nearer, farther] = a.index.x <= b.index.x ? [a, b] : [b, a];
  return [
    toPx(nearer.index, width, height),
    toPx(farther.index, width, height),
    toPx(farther.thumb, width, height),
    toPx(nearer.thumb, width, height),
  ];
}

/** A sub-rectangle of a source image, in that image's own pixel space. */
export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Pixel dimensions of any CanvasImageSource. Duck-typed rather than
 * instanceof-checked so it works for video, image, canvas, ImageBitmap and
 * VideoFrame alike. Returns null when the source has no usable size yet
 * (e.g. a video before metadata loads).
 */
export function sourceSize(source: CanvasImageSource): { width: number; height: number } | null {
  const candidate = source as Partial<{
    videoWidth: number;
    videoHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    displayWidth: number;
    displayHeight: number;
    width: unknown;
    height: unknown;
  }>;

  const plainWidth = typeof candidate.width === 'number' ? candidate.width : 0;
  const plainHeight = typeof candidate.height === 'number' ? candidate.height : 0;
  const width = candidate.videoWidth || candidate.naturalWidth || candidate.displayWidth || plainWidth;
  const height = candidate.videoHeight || candidate.naturalHeight || candidate.displayHeight || plainHeight;

  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * The region of the source image lying *behind* the quad, so the hand-held
 * screen reads as a window onto the scene rather than a shrunken copy of the
 * whole frame. Uses the quad's axis-aligned bounding box: a rotated quad
 * therefore shows slightly more than it strictly covers, which is invisible in
 * practice and far cheaper than true inverse sampling.
 *
 * The engine draws the source stretched to fill the canvas, so canvas
 * coordinates scale linearly into source coordinates. Returns null when the
 * quad lies entirely off-canvas.
 */
export function sourceRectForQuad(
  quad: QuadCorners,
  canvasWidth: number,
  canvasHeight: number,
  srcWidth: number,
  srcHeight: number,
): SourceRect | null {
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const left = Math.max(0, Math.min(...xs));
  const right = Math.min(canvasWidth, Math.max(...xs));
  const top = Math.max(0, Math.min(...ys));
  const bottom = Math.min(canvasHeight, Math.max(...ys));
  if (right <= left || bottom <= top) return null;

  const scaleX = srcWidth / canvasWidth;
  const scaleY = srcHeight / canvasHeight;
  return {
    sx: left * scaleX,
    sy: top * scaleY,
    sw: (right - left) * scaleX,
    sh: (bottom - top) * scaleY,
  };
}

/**
 * Re-expresses whole-frame normalized landmarks as normalized coordinates
 * *within* `rect`, so overlays anchored to the full camera frame (face
 * filters) can be drawn into the cropped texture buffer instead.
 *
 * Values outside 0..1 mean the landmark falls outside the crop — left as-is
 * rather than clamped, so a partially-visible face still draws its visible
 * part correctly and simply spills past the buffer edge.
 */
export function remapLandmarksToRect(
  landmarks: NormalizedLandmark[],
  srcWidth: number,
  srcHeight: number,
  rect: SourceRect,
): NormalizedLandmark[] {
  if (rect.sw <= 0 || rect.sh <= 0) return [];
  return landmarks.map((lm) => ({
    x: (lm.x * srcWidth - rect.sx) / rect.sw,
    y: (lm.y * srcHeight - rect.sy) / rect.sh,
    z: lm.z,
  }));
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
