import { lookupAction, type ActionId } from '../lib/actions';
import { BRUSH_COLORS, BRUSH_SIZES } from '../lib/colors';
import { EFFECTS, type EffectId } from '../lib/effects';
import type { HandObservation, Handedness } from '../lib/recognition';
import type { Point } from '../types';

export interface InteractionState {
  drawingEnabled: boolean;
  eraser: boolean;
  colorIndex: number;
  sizeIndex: number;
  effect: EffectId;
}

const INITIAL_STATE: InteractionState = {
  drawingEnabled: true,
  eraser: false,
  colorIndex: 0,
  sizeIndex: 1,
  effect: 'none',
};

type CanvasGetter = () => HTMLCanvasElement | null;
type StateListener = (state: InteractionState) => void;

/**
 * Framework-agnostic interaction layer. Translates gesture events into drawing
 * commands on a persistent canvas and into UI settings (brush, effect). The
 * engine renders the live video; this controller owns the separate stroke
 * layer stacked above it.
 */
export class InteractionController {
  private state: InteractionState = { ...INITIAL_STATE };
  /** Hands currently holding the 'paint' gesture → their last stroke point. */
  private readonly painting = new Map<Handedness, Point | null>();

  constructor(
    private readonly getDrawCanvas: CanvasGetter,
    private readonly getVideoCanvas: CanvasGetter,
    private readonly onStateChange: StateListener,
  ) {}

  getState(): InteractionState {
    return this.state;
  }

  getEffect(): EffectId {
    return this.state.effect;
  }

  handleGestureStart(handedness: Handedness, gestureId: string): void {
    const action = lookupAction(handedness, gestureId);
    if (!action) return;

    if (action.id === 'paint') {
      this.painting.set(handedness, null);
      return;
    }
    this.runTrigger(action.id);
  }

  handleGestureEnd(handedness: Handedness, gestureId: string): void {
    const action = lookupAction(handedness, gestureId);
    if (action?.id === 'paint') this.painting.delete(handedness);
  }

  /** Per-frame: extend strokes for any hand currently painting. */
  frame(hands: HandObservation[]): void {
    const draw = this.getDrawCanvas();
    if (!draw) return;
    this.syncSize(draw);
    const ctx = draw.getContext('2d');
    if (!ctx) return;

    for (const hand of hands) {
      if (!this.painting.has(hand.handedness)) continue;
      const last = this.painting.get(hand.handedness) ?? null;
      if (this.state.drawingEnabled) this.stroke(ctx, last, hand.pointer);
      this.painting.set(hand.handedness, hand.pointer);
    }
  }

  private runTrigger(id: ActionId): void {
    switch (id) {
      case 'toggle-eraser':
        this.state = { ...this.state, eraser: !this.state.eraser };
        break;
      case 'toggle-draw':
        this.state = { ...this.state, drawingEnabled: !this.state.drawingEnabled };
        break;
      case 'cycle-color':
        this.state = { ...this.state, colorIndex: (this.state.colorIndex + 1) % BRUSH_COLORS.length };
        break;
      case 'cycle-size':
        this.state = { ...this.state, sizeIndex: (this.state.sizeIndex + 1) % BRUSH_SIZES.length };
        break;
      case 'cycle-effect': {
        const next = (EFFECTS.indexOf(this.state.effect) + 1) % EFFECTS.length;
        this.state = { ...this.state, effect: EFFECTS[next] ?? 'none' };
        break;
      }
      case 'clear':
        this.clearDrawing();
        break;
      case 'snapshot':
        this.snapshot();
        break;
      case 'paint':
        return;
    }
    this.onStateChange(this.state);
  }

  private stroke(ctx: CanvasRenderingContext2D, from: Point | null, to: Point): void {
    ctx.save();
    if (this.state.eraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = BRUSH_COLORS[this.state.colorIndex] ?? '#ffffff';
    }
    ctx.lineWidth = BRUSH_SIZES[this.state.sizeIndex] ?? 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const start = from ?? to;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  private clearDrawing(): void {
    const draw = this.getDrawCanvas();
    const ctx = draw?.getContext('2d');
    if (draw && ctx) ctx.clearRect(0, 0, draw.width, draw.height);
  }

  /**
   * Composite the live frame and the strokes into one mirrored PNG (matching
   * the on-screen scaleX(-1)) and trigger a download.
   */
  private snapshot(): void {
    const draw = this.getDrawCanvas();
    const video = this.getVideoCanvas();
    if (!draw || !video || video.width === 0) return;

    const out = document.createElement('canvas');
    out.width = video.width;
    out.height = video.height;
    const octx = out.getContext('2d');
    if (!octx) return;

    octx.translate(out.width, 0);
    octx.scale(-1, 1);
    octx.drawImage(video, 0, 0);
    octx.drawImage(draw, 0, 0);

    const link = document.createElement('a');
    link.href = out.toDataURL('image/png');
    link.download = `hand-snapshot-${Date.now()}.png`;
    link.click();
  }

  /** Keep the stroke layer the same pixel size as the video canvas, preserving content. */
  private syncSize(draw: HTMLCanvasElement): void {
    const video = this.getVideoCanvas();
    if (!video || video.width === 0 || video.height === 0) return;
    if (draw.width === video.width && draw.height === video.height) return;

    const prev = document.createElement('canvas');
    prev.width = draw.width;
    prev.height = draw.height;
    prev.getContext('2d')?.drawImage(draw, 0, 0);

    draw.width = video.width;
    draw.height = video.height;
    draw.getContext('2d')?.drawImage(prev, 0, 0);
  }
}
