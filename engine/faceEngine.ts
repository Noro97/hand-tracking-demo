import { COLORS } from '../lib/colors';
import { computeFaceMetrics, type FaceMetrics } from '../lib/faceMetrics';
import { drawActiveFilters } from '../lib/filterRenderers';
import type { CameraInstance, FaceMeshInstance, FaceMeshResults, NormalizedLandmark } from '../types';

export interface FaceEngineState {
  faceDetected: boolean;
  metrics: FaceMetrics | null;
}

export interface FaceEngineCallbacks {
  onReady?: () => void;
  /** Throttled mirror for React HUD. */
  onState?: (state: FaceEngineState) => void;
  /** Active AR-filter ids to draw this frame. Identity must be stable (read state via ref). */
  getActiveFilters?: () => readonly string[];
}

const HUD_UPDATE_INTERVAL_MS = 100;
const MAX_FACES = 1;

/**
 * Framework-agnostic orchestrator for Face Mesh, mirroring {@link HandEngine}:
 * detection (MediaPipe) → metrics → canvas render → throttled state. Same
 * UMD-globals loading, same local-assets path, same render-to-canvas flow —
 * the mirrored view comes from the global `canvas { scaleX(-1) }` CSS rule.
 */
export class FaceEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver;

  private faceMesh: FaceMeshInstance | null = null;
  private camera: CameraInstance | null = null;
  private mounted = false;
  private reportedReady = false;
  private lastHudUpdate = 0;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLDivElement,
    private readonly callbacks: FaceEngineCallbacks,
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
    const FaceMeshCtor = window.FaceMesh;
    const CameraCtor = window.Camera;
    if (!FaceMeshCtor || !CameraCtor) return;

    this.mounted = true;

    const faceMesh = new FaceMeshCtor({ locateFile: (file) => `/mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({
      maxNumFaces: MAX_FACES,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults((results) => this.onResults(results));
    this.faceMesh = faceMesh;

    this.camera = new CameraCtor(this.video, {
      onFrame: async () => {
        if (this.faceMesh && this.video) await this.faceMesh.send({ image: this.video });
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
    this.faceMesh?.close();
    this.camera = null;
    this.faceMesh = null;
  }

  private onResults(results: FaceMeshResults): void {
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

    const landmarks = results.multiFaceLandmarks?.[0];
    let metrics: FaceMetrics | null = null;
    if (landmarks) {
      metrics = computeFaceMetrics(landmarks);
      this.renderFace(landmarks);
      const activeFilters = this.callbacks.getActiveFilters?.() ?? [];
      if (activeFilters.length > 0) {
        drawActiveFilters(ctx, activeFilters, 'face', landmarks, canvas.width, canvas.height);
      }
    }

    ctx.restore();

    if (now - this.lastHudUpdate > HUD_UPDATE_INTERVAL_MS) {
      this.lastHudUpdate = now;
      this.callbacks.onState?.({ faceDetected: landmarks !== undefined, metrics });
    }
  }

  private renderFace(landmarks: NormalizedLandmark[]): void {
    const { ctx } = this;
    const drawConnectors = window.drawConnectors;
    const tesselation = window.FACEMESH_TESSELATION;
    const contours = window.FACEMESH_CONTOURS;
    if (!drawConnectors) return;

    if (tesselation) {
      drawConnectors(ctx, landmarks, tesselation, { color: COLORS.faceMeshLine, lineWidth: 0.5 });
    }
    if (contours) {
      drawConnectors(ctx, landmarks, contours, { color: COLORS.faceContourLine, lineWidth: 1.5 });
    }
  }
}
