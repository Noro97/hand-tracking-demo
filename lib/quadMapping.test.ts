import { describe, expect, it } from 'vitest';
import { affineFromTriangle, quadFromHands, sourceRectForQuad, sourceSize, type QuadCorners } from './quadMapping';
import { LM } from './landmarks';
import type { HandObservation, Handedness } from './recognition';
import type { NormalizedLandmark, Point } from '../types';

function lm(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0 };
}

function handWithTips(handedness: Handedness, indexTip: NormalizedLandmark, thumbTip: NormalizedLandmark): HandObservation {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.INDEX_TIP] = indexTip;
  landmarks[LM.THUMB_TIP] = thumbTip;
  return { handedness, handednessScore: 1, pointer: { x: 0, y: 0 }, gestures: {}, gestureDistances: {}, landmarks };
}

describe('affineFromTriangle', () => {
  const apply = (t: { a: number; b: number; c: number; d: number; e: number; f: number }, p: Point): Point => ({
    x: t.a * p.x + t.c * p.y + t.e,
    y: t.b * p.x + t.d * p.y + t.f,
  });

  it('maps each source vertex exactly onto its destination vertex', () => {
    const src: [Point, Point, Point] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 50 }];
    const dst: [Point, Point, Point] = [{ x: 10, y: 20 }, { x: 110, y: 40 }, { x: 5, y: 90 }];
    const t = affineFromTriangle(src, dst);
    expect(t).not.toBeNull();
    for (let i = 0; i < 3; i++) {
      const mapped = apply(t!, src[i]!);
      expect(mapped.x).toBeCloseTo(dst[i]!.x);
      expect(mapped.y).toBeCloseTo(dst[i]!.y);
    }
  });

  it('is identity when source and destination coincide', () => {
    const tri: [Point, Point, Point] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
    const t = affineFromTriangle(tri, tri);
    expect(t?.a).toBeCloseTo(1);
    expect(t?.d).toBeCloseTo(1);
    expect(t?.b).toBeCloseTo(0);
    expect(t?.c).toBeCloseTo(0);
    expect(t?.e).toBeCloseTo(0);
    expect(t?.f).toBeCloseTo(0);
  });

  it('returns null for a degenerate (collinear) source triangle', () => {
    const src: [Point, Point, Point] = [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }];
    const dst: [Point, Point, Point] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
    expect(affineFromTriangle(src, dst)).toBeNull();
  });
});

describe('quadFromHands', () => {
  it('builds TL/TR/BR/BL from left/right index and thumb tips in pixel space', () => {
    const hands = [
      handWithTips('Left', lm(0.2, 0.3), lm(0.25, 0.7)),
      handWithTips('Right', lm(0.8, 0.3), lm(0.75, 0.7)),
    ];
    const quad = quadFromHands(hands, 100, 100);
    expect(quad).toEqual([
      { x: 20, y: 30 }, // TL = left index
      { x: 80, y: 30 }, // TR = right index
      { x: 75, y: 70 }, // BR = right thumb
      { x: 25, y: 70 }, // BL = left thumb
    ]);
  });

  it('orders corners by canvas x, not by handedness label (mirror regression)', () => {
    // SWAP_HANDEDNESS makes "Left" mean screen-left, and the CSS-mirrored canvas
    // puts that hand at the LARGER canvas x. Label-ordering wound the quad
    // backwards here and mirrored the texture against the scene behind it.
    const hands = [
      handWithTips('Left', lm(0.8, 0.3), lm(0.75, 0.7)),
      handWithTips('Right', lm(0.2, 0.3), lm(0.25, 0.7)),
    ];
    const quad = quadFromHands(hands, 100, 100);
    expect(quad).toEqual([
      { x: 20, y: 30 }, // TL — geometrically leftmost index tip
      { x: 80, y: 30 }, // TR
      { x: 75, y: 70 }, // BR
      { x: 25, y: 70 }, // BL
    ]);
    expect(quad![0].x).toBeLessThan(quad![1].x);
  });

  it('returns null when either hand is missing', () => {
    const onlyLeft = [handWithTips('Left', lm(0.2, 0.3), lm(0.25, 0.7))];
    expect(quadFromHands(onlyLeft, 100, 100)).toBeNull();
    expect(quadFromHands([], 100, 100)).toBeNull();
  });

  it('returns null when a corner landmark is missing', () => {
    const noThumb: HandObservation = {
      handedness: 'Right',
      handednessScore: 1,
      pointer: { x: 0, y: 0 },
      gestures: {},
      gestureDistances: {},
      landmarks: (() => {
        const l: NormalizedLandmark[] = [];
        l[LM.INDEX_TIP] = lm(0.8, 0.3);
        return l;
      })(),
    };
    const hands = [handWithTips('Left', lm(0.2, 0.3), lm(0.25, 0.7)), noThumb];
    expect(quadFromHands(hands, 100, 100)).toBeNull();
  });
});

describe('sourceSize', () => {
  it('prefers intrinsic video dimensions over layout size', () => {
    const video = { videoWidth: 1280, videoHeight: 720, width: 640, height: 360 };
    expect(sourceSize(video as unknown as CanvasImageSource)).toEqual({ width: 1280, height: 720 });
  });

  it('falls back to plain width/height for canvas and ImageBitmap', () => {
    expect(sourceSize({ width: 192, height: 108 } as unknown as CanvasImageSource)).toEqual({
      width: 192,
      height: 108,
    });
  });

  it('returns null when no usable size is available yet', () => {
    expect(sourceSize({ width: 0, height: 0 } as unknown as CanvasImageSource)).toBeNull();
    expect(sourceSize({} as unknown as CanvasImageSource)).toBeNull();
  });
});

describe('sourceRectForQuad', () => {
  const quad = (x0: number, y0: number, x1: number, y1: number): QuadCorners => [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];

  it('returns the quad bounding box when source and canvas match 1:1', () => {
    expect(sourceRectForQuad(quad(20, 30, 80, 70), 100, 100, 100, 100)).toEqual({
      sx: 20,
      sy: 30,
      sw: 60,
      sh: 40,
    });
  });

  it('scales canvas coordinates into a differently-sized source', () => {
    // Canvas 640x360 displaying a 1280x720 camera frame → exactly 2x.
    expect(sourceRectForQuad(quad(10, 20, 50, 60), 640, 360, 1280, 720)).toEqual({
      sx: 20,
      sy: 40,
      sw: 80,
      sh: 80,
    });
  });

  it('clamps a quad extending past the canvas edges', () => {
    const rect = sourceRectForQuad(quad(-50, -50, 40, 40), 100, 100, 100, 100);
    expect(rect).toEqual({ sx: 0, sy: 0, sw: 40, sh: 40 });
  });

  it('uses the bounding box of a rotated quad', () => {
    const rotated: QuadCorners = [
      { x: 50, y: 10 },
      { x: 90, y: 50 },
      { x: 50, y: 90 },
      { x: 10, y: 50 },
    ];
    expect(sourceRectForQuad(rotated, 100, 100, 100, 100)).toEqual({ sx: 10, sy: 10, sw: 80, sh: 80 });
  });

  it('returns null for an entirely off-canvas quad or a zero-sized canvas', () => {
    expect(sourceRectForQuad(quad(-90, -90, -10, -10), 100, 100, 100, 100)).toBeNull();
    expect(sourceRectForQuad(quad(10, 10, 50, 50), 0, 0, 100, 100)).toBeNull();
  });
});
