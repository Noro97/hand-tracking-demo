import { describe, expect, it } from 'vitest';
import { affineFromTriangle, quadFromHands } from './quadMapping';
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
