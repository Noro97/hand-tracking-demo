import { describe, expect, it, vi } from 'vitest';
import { LM } from './landmarks';
import type { HandObservation, Handedness } from './recognition';
import { ASCII_RAMP, asciiGlyph, posterColor, SCENE_EFFECTS, SceneEffectRenderer } from './sceneEffects';

describe('posterColor', () => {
  it('quantizes luminance into the four-band pink-duotone palette', () => {
    expect(posterColor(0)).toEqual([22, 22, 28]); // shadow
    expect(posterColor(100)).toEqual([236, 72, 153]); // pink mid-low
    expect(posterColor(150)).toEqual([156, 163, 175]); // gray mid-high
    expect(posterColor(255)).toEqual([245, 245, 245]); // highlight
  });

  it('band edges land on the brighter side', () => {
    expect(posterColor(64)).toEqual([236, 72, 153]);
    expect(posterColor(128)).toEqual([156, 163, 175]);
    expect(posterColor(192)).toEqual([245, 245, 245]);
  });
});

describe('asciiGlyph', () => {
  it('maps darkness to blank and brightness to the densest glyph', () => {
    expect(asciiGlyph(0)).toBe(' ');
    expect(asciiGlyph(255)).toBe('#');
  });

  it('walks the ramp monotonically with luminance', () => {
    let prevIndex = -1;
    for (let lum = 0; lum <= 255; lum += 16) {
      const index = ASCII_RAMP.indexOf(asciiGlyph(lum) as (typeof ASCII_RAMP)[number]);
      expect(index).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = index;
    }
  });

  it('uses only horizontally symmetric glyphs (the canvas is mirrored)', () => {
    // Every ramp character must read identically when flipped: a curated set,
    // enforced here so nobody adds e.g. 'b' or '/' later without noticing.
    const symmetric = new Set([' ', '.', ':', '+', '*', '=', '#', '|', '-', 'o', 'O', '0', 'x', 'X', 'H', 'I', 'T', 'V', 'W', 'M', 'A', 'U', 'Y']);
    for (const glyph of ASCII_RAMP) {
      expect(symmetric.has(glyph)).toBe(true);
    }
  });
});

describe('SCENE_EFFECTS registry', () => {
  it('has unique ids and a label for every effect', () => {
    const ids = SCENE_EFFECTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SCENE_EFFECTS.every((e) => e.label.length > 0)).toBe(true);
  });
});

describe('SceneEffectRenderer smoothing grace period', () => {
  function makeHands(): HandObservation[] {
    const lm = (x: number, y: number) => ({ x, y, z: 0 });
    const makeHand = (handedness: Handedness, xOffset: number): HandObservation => {
      const landmarks = [];
      landmarks[LM.INDEX_TIP] = lm(xOffset + 0.1, 0.2);
      landmarks[LM.THUMB_TIP] = lm(xOffset + 0.1, 0.5);
      return { handedness, handednessScore: 1, pointer: { x: 0, y: 0 }, gestures: {}, gestureDistances: {}, landmarks };
    };
    return [makeHand('Left', 0), makeHand('Right', 0.5)];
  }

  it('retains smoothing filters across a 1-frame tracking dropout within QUAD_GRACE_MS', () => {
    const renderer = new SceneEffectRenderer();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const source = { width: 640, height: 360 } as unknown as CanvasImageSource;

    // Frame 1 at t=1000: active quad
    renderer.draw(ctx, 'poster', makeHands(), source, 640, 360, 1000);
    expect(renderer.hasFilters()).toBe(true);

    // Frame 2 at t=1033 (1 frame later): hand lost
    renderer.draw(ctx, 'poster', [], source, 640, 360, 1033);
    expect(renderer.hasFilters()).toBe(true); // preserved during grace period

    // Frame 3 at t=1066: hand returns within grace window
    renderer.draw(ctx, 'poster', makeHands(), source, 640, 360, 1066);
    expect(renderer.hasFilters()).toBe(true);

    // Frame 4 at t=1400 (334ms > 250ms grace without hands): filters reset
    renderer.draw(ctx, 'poster', [], source, 640, 360, 1400);
    expect(renderer.hasFilters()).toBe(false);
  });
});
