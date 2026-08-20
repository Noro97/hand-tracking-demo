import { describe, expect, it } from 'vitest';
import { aimFromHand, mirrorAim, mirrorX, pointInCircle } from './aiming';
import { LM } from './landmarks';
import type { NormalizedLandmark } from '../types';

function hand(mcp: [number, number], tip: [number, number]): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.INDEX_MCP] = { x: mcp[0], y: mcp[1], z: 0 };
  landmarks[LM.INDEX_TIP] = { x: tip[0], y: tip[1], z: 0 };
  return landmarks;
}

describe('aimFromHand', () => {
  it('puts the cursor on the fingertip and the muzzle on the knuckle', () => {
    const aim = aimFromHand(hand([0.5, 0.5], [0.5, 0.25]), 1000, 1000);
    expect(aim!.cursor).toEqual({ x: 500, y: 250 });
    expect(aim!.muzzle).toEqual({ x: 500, y: 500 });
  });

  it('still aims when the finger points AT the camera — the case a projected ray could not handle', () => {
    // Pointing at the screen collapses knuckle and tip onto nearly the same 2D
    // point. A direction-based ray degenerates here (zero length -> null or
    // pure noise); a cursor is still perfectly well defined.
    const aim = aimFromHand(hand([0.42, 0.6], [0.4200001, 0.6000001]), 1000, 1000);
    expect(aim).not.toBeNull();
    expect(aim!.cursor.x).toBeCloseTo(420);
    expect(aim!.cursor.y).toBeCloseTo(600);
  });

  it('returns null only when a required landmark is missing', () => {
    expect(aimFromHand([], 1000, 1000)).toBeNull();
    expect(aimFromHand(hand([0.5, 0.5], [0.5, 0.5]), 1000, 1000)).not.toBeNull();
  });
});

describe('pointInCircle', () => {
  const centre = { x: 100, y: 100 };

  it('accepts the centre and the exact edge, rejects just outside', () => {
    expect(pointInCircle({ x: 100, y: 100 }, centre, 40)).toBe(true);
    expect(pointInCircle({ x: 140, y: 100 }, centre, 40)).toBe(true);
    expect(pointInCircle({ x: 141, y: 100 }, centre, 40)).toBe(false);
  });

  it('measures radially, not per-axis', () => {
    // (30,30) is within 40 on each axis but 42.4 away radially.
    expect(pointInCircle({ x: 130, y: 130 }, centre, 40)).toBe(false);
  });
});

describe('mirrorX', () => {
  it('reflects across the canvas mid-line', () => {
    expect(mirrorX({ x: 0, y: 7 }, 1000)).toEqual({ x: 1000, y: 7 });
    expect(mirrorX({ x: 250, y: 7 }, 1000)).toEqual({ x: 750, y: 7 });
  });

  it('leaves the centre fixed and is its own inverse', () => {
    expect(mirrorX({ x: 500, y: 0 }, 1000)).toEqual({ x: 500, y: 0 });
    expect(mirrorX(mirrorX({ x: 123, y: 45 }, 1000), 1000)).toEqual({ x: 123, y: 45 });
  });

  it('never touches y — mirroring is horizontal only', () => {
    expect(mirrorX({ x: 10, y: 999 }, 1000).y).toBe(999);
  });
});

describe('mirrorAim', () => {
  it('mirrors cursor and muzzle together, preserving their relationship', () => {
    const mirrored = mirrorAim({ cursor: { x: 200, y: 100 }, muzzle: { x: 300, y: 400 } }, 1000);
    expect(mirrored.cursor).toEqual({ x: 800, y: 100 });
    expect(mirrored.muzzle).toEqual({ x: 700, y: 400 });
    // The finger pointed left-of-muzzle before; it must point right-of-muzzle after.
    expect(mirrored.cursor.x).toBeGreaterThan(mirrored.muzzle.x);
  });
});
