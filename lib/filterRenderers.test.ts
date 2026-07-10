import { describe, expect, it } from 'vitest';
import { FACE_FILTERS, FILTERS, HAND_FILTERS } from './filterRenderers';

describe('filter registry', () => {
  it('has unique ids', () => {
    const ids = FILTERS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('partitions cleanly into face and hand filters', () => {
    expect(FACE_FILTERS.length + HAND_FILTERS.length).toBe(FILTERS.length);
    expect(FACE_FILTERS.every((f) => f.target === 'face')).toBe(true);
    expect(HAND_FILTERS.every((f) => f.target === 'hand')).toBe(true);
  });

  it('every draw function survives missing landmarks without throwing', () => {
    // Draw functions must guard partial detections — an empty landmark array
    // is the harshest case. A minimal ctx stub suffices because a correctly
    // guarded draw returns before touching the context at all.
    const ctx = {} as CanvasRenderingContext2D;
    for (const filter of FILTERS) {
      expect(() => filter.draw(ctx, [], 100, 100)).not.toThrow();
    }
  });
});
