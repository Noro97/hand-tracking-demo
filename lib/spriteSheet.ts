export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SpriteManifest = Record<string, SpriteRect | SpriteRect[]>;

export interface SpriteAtlas {
  readonly loaded: boolean;
  has(name: string): boolean;
  getFrame(name: string, frameIndex?: number): SpriteRect | null;
  draw(
    ctx: CanvasRenderingContext2D,
    name: string,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
    frameIndex?: number,
  ): boolean;
}

/**
 * Lightweight sprite-sheet atlas renderer.
 * Returns `false` on draw if the sprite is missing or the atlas is unloaded,
 * allowing the calling renderer to perform a clean vector fallback.
 */
export class CanvasSpriteAtlas implements SpriteAtlas {
  constructor(
    private readonly image: CanvasImageSource | null,
    private readonly manifest: SpriteManifest,
    public readonly loaded: boolean = true,
  ) {}

  has(name: string): boolean {
    return name in this.manifest;
  }

  getFrame(name: string, frameIndex = 0): SpriteRect | null {
    const entry = this.manifest[name];
    if (!entry) return null;
    if (Array.isArray(entry)) {
      if (entry.length === 0) return null;
      const idx = Math.max(0, Math.min(frameIndex, entry.length - 1));
      return entry[idx] ?? null;
    }
    return entry;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    name: string,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
    frameIndex = 0,
  ): boolean {
    if (!this.loaded || !this.image) return false;
    const frame = this.getFrame(name, frameIndex);
    if (!frame) return false;

    try {
      ctx.drawImage(
        this.image,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        destX,
        destY,
        destW,
        destH,
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const NULL_ATLAS: SpriteAtlas = new CanvasSpriteAtlas(null, {}, false);

export async function loadSpriteAtlas(
  url: string,
  manifest: SpriteManifest,
  imageLoader: (url: string) => Promise<CanvasImageSource> = defaultImageLoader,
): Promise<SpriteAtlas> {
  if (!url) return NULL_ATLAS;
  try {
    const image = await imageLoader(url);
    return new CanvasSpriteAtlas(image, manifest, true);
  } catch {
    return NULL_ATLAS;
  }
}

function defaultImageLoader(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image is not defined in this environment'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
    img.src = url;
  });
}
