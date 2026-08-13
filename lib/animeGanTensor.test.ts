import { describe, expect, it } from 'vitest';
import { rgbaToTensor, tensorToRgba } from './animeGanTensor';

describe('rgbaToTensor', () => {
  it('normalizes 0/127.5/255 to -1/0/1 and drops alpha', () => {
    const rgba = new Uint8ClampedArray([0, 128, 255, 99]);
    const tensor = rgbaToTensor(rgba, 1, 1);
    expect(tensor).toHaveLength(3);
    expect(tensor[0]).toBeCloseTo(-1);
    expect(tensor[1]).toBeCloseTo(128 / 127.5 - 1);
    expect(tensor[2]).toBeCloseTo(1);
  });

  it('produces exactly width*height*3 values regardless of aspect ratio', () => {
    const rgba = new Uint8ClampedArray(192 * 108 * 4);
    expect(rgbaToTensor(rgba, 192, 108)).toHaveLength(192 * 108 * 3);
  });
});

describe('tensorToRgba', () => {
  it('maps -1/0/1 back to 0/127.5/255 with opaque alpha', () => {
    const rgba = tensorToRgba(new Float32Array([-1, 0, 1]), 1, 1);
    expect(rgba[0]).toBe(0);
    expect(rgba[1]).toBe(128); // Uint8ClampedArray rounds 127.5 to even → 128
    expect(rgba[2]).toBe(255);
    expect(rgba[3]).toBe(255);
  });

  it('clamps values outside the tanh range instead of wrapping', () => {
    const rgba = tensorToRgba(new Float32Array([-5, 5, 0]), 1, 1);
    expect(rgba[0]).toBe(0);
    expect(rgba[1]).toBe(255);
  });
});

describe('round trip', () => {
  it('preserves pixel values within one quantization step', () => {
    const original = new Uint8ClampedArray([0, 64, 128, 255, 200, 17, 3, 255]);
    const back = tensorToRgba(rgbaToTensor(original, 2, 1), 2, 1);
    for (const channel of [0, 1, 2, 4, 5, 6]) {
      expect(Math.abs(back[channel]! - original[channel]!)).toBeLessThanOrEqual(1);
    }
    expect(back[3]).toBe(255);
    expect(back[7]).toBe(255);
  });
});
