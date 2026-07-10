import { COLORS, HAND_COLOR, POINTER_DOT_RADIUS, POINTER_RADIUS_IDLE, POINTER_RADIUS_PINCH } from '../lib/colors';
import { drawActiveFilters } from '../lib/filterRenderers';
import { GestureEventDispatcher } from '../lib/gestureEventDispatcher';
import { HandRecognizer, type HandObservation, type Handedness } from '../lib/recognition';
import type { CameraInstance, HandsInstance, HandsResults, NormalizedLandmark } from '../types';

export interface HandEngineState {
  hands: HandObservation[];
}

/** One hand's landmarks as MediaPipe reported them, after handedness-resolve
 *  but before the per-frame same-label dedup — the raw material for
 *  recording/replay fixtures (see features/replay.ts). */
export interface RawHandFrame {
  handedness: Handedness;
  /** MediaPipe's handedness-classification confidence — recorded so fixtures
   *  can replay the score gate exactly (a face-as-hand false positive is only
   *  reproducible if its low score is captured too). */
  score: number;
  landmarks: NormalizedLandmark[];
}

export interface HandEngineCallbacks {
  onReady?: () => void;
  /** Throttled mirror for React HUD. */
  onState?: (state: HandEngineState) => void;
  /** Every frame, unthrottled — for smooth drawing. */
  onFrame?: (state: HandEngineState) => void;
  onGestureStart?: (handedness: Handedness, gestureId: string) => void;
  onGestureEnd?: (handedness: Handedness, gestureId: string) => void;
  /** Every frame, unthrottled — raw per-hand landmarks for recording fixtures. Not used by production UI. */
  onRawFrame?: (hands: RawHandFrame[], timestampMs: number) => void;
  /** Active AR-filter ids to draw this frame. Identity must be stable (read state via ref). */
  getActiveFilters?: () => readonly string[];
}

const HUD_UPDATE_INTERVAL_MS = 100;
const MAX_HANDS = 2;

// Raised from the 0.5 defaults after a live false positive: MediaPipe locked a
// "hand" onto the user's mouth/beard and confirmed a pinch on it. Higher
// thresholds make the detector far pickier about what counts as a hand.
// Tunable trade-off: if REAL hands stop being detected in dim lighting, lower
// MIN_DETECTION_CONFIDENCE first (the debug panel's per-hand score helps tell
// a rejected real hand from a suppressed false positive).
const MIN_DETECTION_CONFIDENCE = 0.75;
const MIN_TRACKING_CONFIDENCE = 0.7;

/**
 * The input video is shown mirrored (CSS scaleX(-1)) for a natural "selfie"
 * feel, but MediaPipe processes the un-mirrored frame and labels handedness
 * accordingly. Swapping the label makes "Left"/"Right" match the hand the user
 * sees on the left/right of the screen.
 * NOTE: if handedness reads backwards on your camera, flip this single flag.
 */
const SWAP_HANDEDNESS = true;

function resolveHandedness(rawLabel: string): Handedness {
  const isLeft = rawLabel === 'Left';
  const effectiveLeft = SWAP_HANDEDNESS ? !isLeft : isLeft;
  return effectiveLeft ? 'Left' : 'Right';
}

/**
 * Framework-agnostic orchestrator: detection (MediaPipe) → recognition →
 * gesture event dispatch → canvas render → throttled state. React (or anything
 * else) consumes it through the callbacks.
 */
export class HandEngine {
  private readonly recognizer = new HandRecognizer();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver;

  private readonly gestureEvents = new GestureEventDispatcher();

  private hands: HandsInstance | null = null;
  private camera: CameraInstance | null = null;
  private mounted = false;
  private reportedReady = false;
  private lastHudUpdate = 0;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLDivElement,
    private readonly callbacks: HandEngineCallbacks,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context');
    this.ctx = ctx;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      this.canvas.width = entry.contentRect.width;
      this.canvas.height = entry.contentRect.height;
    });
    this.resizeObserver.observe(container);
  }

  start(): void {
    const HandsCtor = window.Hands;
    const CameraCtor = window.Camera;
    if (!HandsCtor || !CameraCtor) return;

    this.mounted = true;

    const hands = new HandsCtor({ locateFile: (file) => `/mediapipe/hands/${file}` });
    hands.setOptions({
      maxNumHands: MAX_HANDS,
      modelComplexity: 1,
      minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence: MIN_TRACKING_CONFIDENCE,
    });
    hands.onResults((results) => this.onResults(results));
    this.hands = hands;

    this.camera = new CameraCtor(this.video, {
      onFrame: async () => {
        if (this.hands && this.video) await this.hands.send({ image: this.video });
      },
      width: 1280,
      height: 720,
    });
    this.camera.start();
  }

  stop(): void {
    this.mounted = false;
    this.resizeObserver.disconnect();
    this.camera?.stop();
    this.hands?.close();
    this.camera = null;
    this.hands = null;
  }

  private onResults(results: HandsResults): void {
    if (!this.mounted) return;

    if (!this.reportedReady) {
      this.reportedReady = true;
      this.callbacks.onReady?.();
    }

    const { ctx, canvas } = this;
    const now = performance.now();

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.videoOverlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const observations: HandObservation[] = [];
    const present = new Set<Handedness>();
    const rawHands: RawHandFrame[] = [];
    const handsLandmarks = results.multiHandLandmarks ?? [];

    for (let i = 0; i < handsLandmarks.length; i++) {
      const landmarks = handsLandmarks[i];
      if (!landmarks) continue;
      const rawLabel = results.multiHandedness?.[i]?.label ?? 'Right';
      const score = results.multiHandedness?.[i]?.score ?? 1;
      const handedness = resolveHandedness(rawLabel);
      rawHands.push({ handedness, score, landmarks });
      if (present.has(handedness)) continue;

      const obs = this.recognizer.recognize(handedness, landmarks, canvas.width, canvas.height, now, score);
      if (!obs) continue;

      present.add(handedness);
      observations.push(obs);
      this.renderHand(obs);
      const activeFilters = this.callbacks.getActiveFilters?.() ?? [];
      if (activeFilters.length > 0) {
        drawActiveFilters(ctx, activeFilters, 'hand', obs.landmarks, canvas.width, canvas.height);
      }
    }

    this.callbacks.onRawFrame?.(rawHands, now);

    this.recognizer.retainOnly(present);
    this.gestureEvents.dispatch(observations, this.callbacks.onGestureStart, this.callbacks.onGestureEnd);

    ctx.restore();

    this.callbacks.onFrame?.({ hands: observations });

    if (now - this.lastHudUpdate > HUD_UPDATE_INTERVAL_MS) {
      this.lastHudUpdate = now;
      this.callbacks.onState?.({ hands: observations });
    }
  }

  private renderHand(obs: HandObservation): void {
    const { ctx } = this;
    const accent = HAND_COLOR[obs.handedness];
    const drawConnectors = window.drawConnectors;
    const drawLandmarks = window.drawLandmarks;
    const handConnections = window.HAND_CONNECTIONS;

    if (drawConnectors && drawLandmarks && handConnections) {
      drawConnectors(ctx, obs.landmarks, handConnections, { color: accent, lineWidth: 2 });
      drawLandmarks(ctx, obs.landmarks, { color: COLORS.landmarkPoint, lineWidth: 1, radius: 3 });
    }

    const active = obs.gestures['thumb-index'] === true;
    ctx.beginPath();
    ctx.arc(obs.pointer.x, obs.pointer.y, active ? POINTER_RADIUS_PINCH : POINTER_RADIUS_IDLE, 0, Math.PI * 2);
    ctx.strokeStyle = active ? COLORS.accentGreen : accent;
    ctx.lineWidth = active ? 3 : 2;
    ctx.stroke();

    if (active) {
      ctx.beginPath();
      ctx.arc(obs.pointer.x, obs.pointer.y, POINTER_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.accentGreen;
      ctx.fill();
    }
  }
}
