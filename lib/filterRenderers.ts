import type { NormalizedLandmark } from '../types';
import { segmentTransform, toPx } from './filterAnchors';
import { FL } from './faceLandmarks';
import { LM } from './landmarks';

export type FilterTarget = 'face' | 'hand';

/**
 * Declarative filter registry (same idea as the GESTURES registry): adding a
 * filter is a data edit, engines just iterate whatever is active. Draw
 * functions receive raw landmarks + canvas size and must guard missing
 * indices themselves (partial detections happen).
 *
 * Canvas-primitive vector shapes only, and symmetric ones on purpose: the
 * canvas is CSS-mirrored (scaleX(-1)), so text or asymmetric glyphs would
 * render flipped.
 */
export interface FilterDef {
  id: string;
  label: string;
  target: FilterTarget;
  draw: (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number) => void;
}

function drawGlasses(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  const right = landmarks[FL.RIGHT_EYE_OUTER];
  const left = landmarks[FL.LEFT_EYE_OUTER];
  if (!right || !left) return;
  const t = segmentTransform(right, left, w, h);

  ctx.save();
  ctx.translate(t.center.x, t.center.y);
  ctx.rotate(t.angleRad);
  const lensR = t.length * 0.26;
  const dx = t.length * 0.36;
  ctx.lineWidth = Math.max(2, t.length * 0.04);
  ctx.strokeStyle = '#1f1f1f';
  ctx.fillStyle = 'rgba(66, 165, 245, 0.18)';

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * dx, 0, lensR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Bridge
  ctx.beginPath();
  ctx.moveTo(-dx + lensR, 0);
  ctx.lineTo(dx - lensR, 0);
  ctx.stroke();
  // Temples out toward the ears
  ctx.beginPath();
  ctx.moveTo(-dx - lensR, 0);
  ctx.lineTo(-dx - lensR - t.length * 0.18, -t.length * 0.06);
  ctx.moveTo(dx + lensR, 0);
  ctx.lineTo(dx + lensR + t.length * 0.18, -t.length * 0.06);
  ctx.stroke();
  ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  const templeRight = landmarks[FL.TEMPLE_RIGHT];
  const templeLeft = landmarks[FL.TEMPLE_LEFT];
  const forehead = landmarks[FL.FOREHEAD];
  if (!templeRight || !templeLeft || !forehead) return;
  const temples = segmentTransform(templeRight, templeLeft, w, h);
  const anchor = toPx(forehead, w, h);
  const half = temples.length * 0.62;

  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(temples.angleRad);
  ctx.fillStyle = '#263238';
  // Brim
  ctx.beginPath();
  ctx.ellipse(0, -half * 0.1, half, half * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Crown
  ctx.beginPath();
  ctx.roundRect(-half * 0.62, -half * 0.95, half * 1.24, half * 0.88, half * 0.1);
  ctx.fill();
  // Band
  ctx.fillStyle = '#ef5350';
  ctx.fillRect(-half * 0.62, -half * 0.34, half * 1.24, half * 0.14);
  ctx.restore();
}

function drawMustache(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  const cornerRight = landmarks[FL.MOUTH_CORNER_RIGHT];
  const cornerLeft = landmarks[FL.MOUTH_CORNER_LEFT];
  const nose = landmarks[FL.NOSE_TIP];
  const lip = landmarks[FL.LIP_UPPER_INNER];
  if (!cornerRight || !cornerLeft || !nose || !lip) return;
  const mouth = segmentTransform(cornerRight, cornerLeft, w, h);
  const nosePx = toPx(nose, w, h);
  const lipPx = toPx(lip, w, h);
  const reach = mouth.length * 0.68;

  ctx.save();
  ctx.translate((nosePx.x + lipPx.x) / 2, (nosePx.y + lipPx.y) / 2);
  ctx.rotate(mouth.angleRad);
  ctx.fillStyle = '#2b1c12';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * reach * 0.5, -mouth.length * 0.16, side * reach, -mouth.length * 0.06);
    ctx.quadraticCurveTo(side * reach * 0.55, mouth.length * 0.14, 0, mouth.length * 0.07);
    ctx.fill();
  }
  ctx.restore();
}

function drawRing(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  const pip = landmarks[LM.RING_PIP];
  const dip = landmarks[LM.RING_DIP];
  if (!pip || !dip) return;
  const seg = segmentTransform(pip, dip, w, h);

  ctx.save();
  ctx.translate(seg.center.x, seg.center.y);
  // The band wraps ACROSS the finger — rotate to be perpendicular to its axis.
  ctx.rotate(seg.angleRad + Math.PI / 2);
  ctx.strokeStyle = '#fdd835';
  ctx.lineWidth = Math.max(2, seg.length * 0.22);
  ctx.beginPath();
  ctx.ellipse(0, 0, seg.length * 0.5, seg.length * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Gem
  ctx.fillStyle = '#42a5f5';
  ctx.beginPath();
  ctx.arc(0, -seg.length * 0.42, seg.length * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const FINGERTIPS = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP];

function drawNails(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number): void {
  const wrist = landmarks[LM.WRIST];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  if (!wrist || !middleMcp) return;
  const radius = Math.max(3, segmentTransform(wrist, middleMcp, w, h).length * 0.09);

  ctx.save();
  for (const tipIndex of FINGERTIPS) {
    const tip = landmarks[tipIndex];
    if (!tip) continue;
    const p = toPx(tip, w, h);
    ctx.fillStyle = '#ef5350';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

export const FILTERS: FilterDef[] = [
  { id: 'glasses', label: 'Glasses', target: 'face', draw: drawGlasses },
  { id: 'hat', label: 'Hat', target: 'face', draw: drawHat },
  { id: 'mustache', label: 'Mustache', target: 'face', draw: drawMustache },
  { id: 'ring', label: 'Ring', target: 'hand', draw: drawRing },
  { id: 'nails', label: 'Nails', target: 'hand', draw: drawNails },
];

export const FACE_FILTERS = FILTERS.filter((f) => f.target === 'face');
export const HAND_FILTERS = FILTERS.filter((f) => f.target === 'hand');

/** Engines call this once per detected face/hand per frame with whatever filter ids are active. */
export function drawActiveFilters(
  ctx: CanvasRenderingContext2D,
  activeIds: readonly string[],
  target: FilterTarget,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
): void {
  for (const filter of FILTERS) {
    if (filter.target !== target || !activeIds.includes(filter.id)) continue;
    filter.draw(ctx, landmarks, width, height);
  }
}
