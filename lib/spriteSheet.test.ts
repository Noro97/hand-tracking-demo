import { describe, expect, it, vi } from 'vitest';
import { CanvasSpriteAtlas, loadSpriteAtlas, NULL_ATLAS } from './spriteSheet';

describe('CanvasSpriteAtlas', () => {
  it('NULL_ATLAS reports loaded: false and returns false on draw', () => {
    expect(NULL_ATLAS.loaded).toBe(false);
    expect(NULL_ATLAS.has('target')).toBe(false);
    expect(NULL_ATLAS.getFrame('target')).toBeNull();

    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    expect(NULL_ATLAS.draw(ctx, 'target', 0, 0, 10, 10)).toBe(false);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('retrieves single frames and multi-frame animation sequences', () => {
    const mockImage = {} as CanvasImageSource;
    const atlas = new CanvasSpriteAtlas(mockImage, {
      single: { x: 0, y: 0, w: 32, h: 32 },
      anim: [
        { x: 32, y: 0, w: 32, h: 32 },
        { x: 64, y: 0, w: 32, h: 32 },
      ],
    });

    expect(atlas.has('single')).toBe(true);
    expect(atlas.has('missing')).toBe(false);
    expect(atlas.getFrame('single')).toEqual({ x: 0, y: 0, w: 32, h: 32 });
    expect(atlas.getFrame('anim', 0)).toEqual({ x: 32, y: 0, w: 32, h: 32 });
    expect(atlas.getFrame('anim', 1)).toEqual({ x: 64, y: 0, w: 32, h: 32 });
    expect(atlas.getFrame('anim', 99)).toEqual({ x: 64, y: 0, w: 32, h: 32 }); // clamped
  });

  it('draws frame onto context with source and destination bounds', () => {
    const mockImage = {} as CanvasImageSource;
    const atlas = new CanvasSpriteAtlas(mockImage, {
      target: { x: 10, y: 20, w: 50, h: 60 },
    });

    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    const drawn = atlas.draw(ctx, 'target', 100, 200, 40, 40);
    expect(drawn).toBe(true);
    expect(drawImage).toHaveBeenCalledWith(mockImage, 10, 20, 50, 60, 100, 200, 40, 40);
  });

  it('loadSpriteAtlas falls back to NULL_ATLAS on loader failure', async () => {
    const failingLoader = vi.fn().mockRejectedValue(new Error('Network error'));
    const atlas = await loadSpriteAtlas('/textures/sheet.png', {}, failingLoader);
    expect(atlas.loaded).toBe(false);
  });

  it('loadSpriteAtlas succeeds when loader resolves image', async () => {
    const mockImage = {} as CanvasImageSource;
    const successfulLoader = vi.fn().mockResolvedValue(mockImage);
    const atlas = await loadSpriteAtlas(
      '/textures/sheet.png',
      { hero: { x: 0, y: 0, w: 16, h: 16 } },
      successfulLoader,
    );
    expect(atlas.loaded).toBe(true);
    expect(atlas.has('hero')).toBe(true);
  });
});
