import { ONE_EURO_BETA, ONE_EURO_D_CUTOFF, ONE_EURO_MIN_CUTOFF, OneEuroFilter } from './filters';
import { drawImageInQuad, quadFromHands, type QuadCorners } from './quadMapping';
import type { HandObservation } from './recognition';

/**
 * Scene effects are the two-hand sibling of the per-hand filter registry: a
 * virtual "screen" stretched between both hands' thumb+index tips, showing a
 * stylized copy of the live camera frame. Unlike per-hand filters they need
 * BOTH hands plus the current video frame, so the engine invokes them through
 * a separate hook after the per-hand loop.
 */
export interface SceneEffectDef {
  id: string;
  label: string;
  /** Redraws the low-res texture buffer from the current camera frame. */
  stylize: (buffer: CanvasRenderingContext2D, source: CanvasImageSource, bw: number, bh: number) => void;
}

/** Texture buffer resolution — deliberately low: cheap per-pixel work and a lo-fi look. */
const BUFFER_W = 192;
const BUFFER_H = 108;

/**
 * Poster palette: luminance quantized into four bands (shadow → pink → gray →
 * highlight), the pink-duotone look. Exported for tests.
 */
export function posterColor(luminance: number): [number, number, number] {
  if (luminance < 64) return [22, 22, 28];
  if (luminance < 128) return [236, 72, 153];
  if (luminance < 192) return [156, 163, 175];
  return [245, 245, 245];
}

/** Symmetric-only glyph ramp (dark → bright) — the canvas is CSS-mirrored, so
 *  every glyph must read the same flipped. Exported for tests. */
export const ASCII_RAMP = [' ', '.', ':', '+', '*', '=', '#'] as const;

export function asciiGlyph(luminance: number): string {
  const index = Math.min(ASCII_RAMP.length - 1, Math.floor((luminance / 256) * ASCII_RAMP.length));
  return ASCII_RAMP[index]!;
}

function stylizePoster(buffer: CanvasRenderingContext2D, source: CanvasImageSource, bw: number, bh: number): void {
  buffer.drawImage(source, 0, 0, bw, bh);
  const image = buffer.getImageData(0, 0, bw, bh);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
    const [r, g, b] = posterColor(lum);
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  }
  buffer.putImageData(image, 0, 0);
}

/** Character cell size in buffer pixels — 6px cells on a 192×108 buffer = a 32×18 glyph grid. */
const ASCII_CELL = 6;

function stylizeAscii(buffer: CanvasRenderingContext2D, source: CanvasImageSource, bw: number, bh: number): void {
  buffer.drawImage(source, 0, 0, bw, bh);
  const image = buffer.getImageData(0, 0, bw, bh);
  const px = image.data;

  buffer.fillStyle = '#0d0d12';
  buffer.fillRect(0, 0, bw, bh);
  buffer.font = `${ASCII_CELL + 1}px monospace`;
  buffer.textAlign = 'center';
  buffer.textBaseline = 'middle';

  for (let cy = 0; cy < bh; cy += ASCII_CELL) {
    for (let cx = 0; cx < bw; cx += ASCII_CELL) {
      // Sample the cell's center pixel — cheap and good enough at this scale.
      const sx = Math.min(bw - 1, cx + ASCII_CELL / 2);
      const sy = Math.min(bh - 1, cy + ASCII_CELL / 2);
      const o = (Math.floor(sy) * bw + Math.floor(sx)) * 4;
      const lum = 0.299 * px[o]! + 0.587 * px[o + 1]! + 0.114 * px[o + 2]!;
      const glyph = asciiGlyph(lum);
      if (glyph === ' ') continue;
      buffer.fillStyle = lum > 170 ? '#f5f5f5' : lum > 90 ? '#ec4899' : '#6b7280';
      buffer.fillText(glyph, cx + ASCII_CELL / 2, cy + ASCII_CELL / 2);
    }
  }
}

export const SCENE_EFFECTS: SceneEffectDef[] = [
  { id: 'poster', label: 'Poster', stylize: stylizePoster },
  { id: 'ascii', label: 'ASCII', stylize: stylizeAscii },
];

/**
 * Stateful renderer the engine owns: smooths the four quad corners with the
 * same One Euro filter the pointer uses (raw fingertip landmarks jitter), and
 * keeps the offscreen texture buffer. Smoothing state resets whenever the
 * screen disappears (a hand left the frame), so a re-formed screen doesn't
 * lerp in from its last position.
 */
export class SceneEffectRenderer {
  private buffer: HTMLCanvasElement | null = null;
  private filters: OneEuroFilter[] | null = null;

  draw(
    ctx: CanvasRenderingContext2D,
    effectId: string,
    hands: HandObservation[],
    source: CanvasImageSource,
    width: number,
    height: number,
    now: number,
  ): void {
    const effect = SCENE_EFFECTS.find((e) => e.id === effectId);
    const quad = effect ? quadFromHands(hands, width, height) : null;
    if (!effect || !quad) {
      this.filters = null;
      return;
    }

    const smoothed = this.smooth(quad, now);
    const buffer = this.ensureBuffer();
    const bufferCtx = buffer.getContext('2d');
    if (!bufferCtx) return;

    effect.stylize(bufferCtx, source, BUFFER_W, BUFFER_H);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawImageInQuad(ctx, buffer, BUFFER_W, BUFFER_H, smoothed);
    ctx.imageSmoothingEnabled = true;

    // Thin white frame, like a held-up pane of glass.
    ctx.beginPath();
    ctx.moveTo(smoothed[0].x, smoothed[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(smoothed[i]!.x, smoothed[i]!.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private ensureBuffer(): HTMLCanvasElement {
    if (!this.buffer) {
      this.buffer = document.createElement('canvas');
      this.buffer.width = BUFFER_W;
      this.buffer.height = BUFFER_H;
    }
    return this.buffer;
  }

  private smooth(quad: QuadCorners, now: number): QuadCorners {
    if (!this.filters) {
      this.filters = Array.from(
        { length: 8 },
        () => new OneEuroFilter(ONE_EURO_MIN_CUTOFF, ONE_EURO_BETA, ONE_EURO_D_CUTOFF),
      );
    }
    const f = this.filters;
    return quad.map((p, i) => ({
      x: f[i * 2]!.filter(p.x, now),
      y: f[i * 2 + 1]!.filter(p.y, now),
    })) as QuadCorners;
  }
}
