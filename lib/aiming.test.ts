import { describe, expect, it } from 'vitest';
import { aimRay, pointAlongRay, rayCircleHit, type Ray } from './aiming';
import { LM } from './landmarks';
import type { NormalizedLandmark } from '../types';

function handPointing(mcp: [number, number], tip: [number, number]): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.INDEX_MCP] = { x: mcp[0], y: mcp[1], z: 0 };
  landmarks[LM.INDEX_TIP] = { x: tip[0], y: tip[1], z: 0 };
  return landmarks;
}

describe('aimRay', () => {
  it('starts at the fingertip and points knuckle→tip', () => {
    const ray = aimRay(handPointing([0.5, 0.5], [0.5, 0.25]), 100, 100);
    expect(ray!.origin).toEqual({ x: 50, y: 25 });
    expect(ray!.direction.x).toBeCloseTo(0);
    expect(ray!.direction.y).toBeCloseTo(-1); // upward in canvas space
  });

  it('always returns a unit direction', () => {
    const ray = aimRay(handPointing([0.2, 0.8], [0.5, 0.4]), 640, 360);
    expect(Math.hypot(ray!.direction.x, ray!.direction.y)).toBeCloseTo(1);
  });

  it('returns null for missing landmarks or a zero-length direction', () => {
    expect(aimRay([], 100, 100)).toBeNull();
    expect(aimRay(handPointing([0.5, 0.5], [0.5, 0.5]), 100, 100)).toBeNull();
  });
});

describe('rayCircleHit', () => {
  const right: Ray = { origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } };

  it('returns the near-side distance for a direct hit', () => {
    expect(rayCircleHit(right, { x: 100, y: 0 }, 10)).toBeCloseTo(90);
  });

  it('misses a circle offset beyond its radius', () => {
    expect(rayCircleHit(right, { x: 100, y: 50 }, 10)).toBeNull();
  });

  it('ignores targets behind the muzzle', () => {
    expect(rayCircleHit(right, { x: -100, y: 0 }, 10)).toBeNull();
  });

  it('returns 0-ish when the origin sits inside the circle', () => {
    const hit = rayCircleHit(right, { x: 0, y: 0 }, 10);
    expect(hit).not.toBeNull();
    expect(hit).toBeGreaterThanOrEqual(0);
  });

  it('grazes a circle exactly one radius off-axis', () => {
    expect(rayCircleHit(right, { x: 100, y: 10 }, 10)).toBeCloseTo(100);
  });
});

describe('pointAlongRay', () => {
  it('walks the ray by the given distance', () => {
    const ray: Ray = { origin: { x: 10, y: 10 }, direction: { x: 0, y: -1 } };
    expect(pointAlongRay(ray, 25)).toEqual({ x: 10, y: -15 });
  });
});
