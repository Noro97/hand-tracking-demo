import { describe, expect, it } from 'vitest';
import { dist, distPx, handSize, midpointPx } from './geometry';
import { LM } from './landmarks';
import type { NormalizedLandmark } from '../types';

function lm(x: number, y: number, z = 0): NormalizedLandmark {
  return { x, y, z };
}

describe('dist', () => {
  it('computes 2D Euclidean distance, ignoring z', () => {
    expect(dist(lm(0, 0), lm(3, 4, 99))).toBeCloseTo(5);
  });

  it('is zero for identical points', () => {
    expect(dist(lm(1, 1), lm(1, 1))).toBe(0);
  });
});

describe('distPx', () => {
  it('computes 2D Euclidean distance between plain points', () => {
    expect(distPx({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
});

describe('handSize', () => {
  it('is the distance between the wrist and middle-MCP landmarks', () => {
    const landmarks: NormalizedLandmark[] = [];
    landmarks[LM.WRIST] = lm(0, 0);
    landmarks[LM.MIDDLE_MCP] = lm(0, 0.2);
    expect(handSize(landmarks)).toBeCloseTo(0.2);
  });

  it('returns 0 if either reference landmark is missing', () => {
    expect(handSize([])).toBe(0);
  });
});

describe('midpointPx', () => {
  it('projects the normalized midpoint into canvas pixel space', () => {
    const point = midpointPx(lm(0, 0), lm(0.5, 1), 200, 100);
    expect(point).toEqual({ x: 50, y: 50 });
  });
});
