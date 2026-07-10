import { describe, expect, it } from 'vitest';
import { segmentTransform, toPx } from './filterAnchors';
import type { NormalizedLandmark } from '../types';

function lm(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0 };
}

describe('toPx', () => {
  it('projects normalized coordinates into pixel space', () => {
    expect(toPx(lm(0.5, 0.25), 200, 100)).toEqual({ x: 100, y: 25 });
  });
});

describe('segmentTransform', () => {
  it('computes center, length, and zero angle for a horizontal segment', () => {
    const t = segmentTransform(lm(0.2, 0.5), lm(0.8, 0.5), 100, 100);
    expect(t.center).toEqual({ x: 50, y: 50 });
    expect(t.length).toBeCloseTo(60);
    expect(t.angleRad).toBeCloseTo(0);
  });

  it('reports a 90° angle for a vertical (downward) segment', () => {
    const t = segmentTransform(lm(0.5, 0.2), lm(0.5, 0.8), 100, 100);
    expect(t.angleRad).toBeCloseTo(Math.PI / 2);
    expect(t.length).toBeCloseTo(60);
  });

  it('scales length with the canvas dimensions, not just normalized distance', () => {
    const small = segmentTransform(lm(0, 0), lm(1, 0), 100, 100);
    const large = segmentTransform(lm(0, 0), lm(1, 0), 400, 100);
    expect(large.length).toBeCloseTo(small.length * 4);
  });

  it('handles a diagonal segment with exact trigonometry', () => {
    const t = segmentTransform(lm(0, 0), lm(0.3, 0.4), 100, 100);
    expect(t.length).toBeCloseTo(50);
    expect(t.angleRad).toBeCloseTo(Math.atan2(40, 30));
    expect(t.center).toEqual({ x: 15, y: 20 });
  });
});
