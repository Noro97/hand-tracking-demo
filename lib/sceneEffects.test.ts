import { describe, expect, it } from 'vitest';
import { ASCII_RAMP, asciiGlyph, posterColor, SCENE_EFFECTS } from './sceneEffects';

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
