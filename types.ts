export interface Point {
  x: number;
  y: number;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandsResults {
  image: CanvasImageSource;
  multiHandLandmarks?: NormalizedLandmark[][];
  multiHandedness?: Array<{ index: number; score: number; label: string }>;
}

export interface HandsOptions {
  maxNumHands?: number;
  modelComplexity?: 0 | 1;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface HandsInstance {
  setOptions(options: HandsOptions): void;
  onResults(callback: (results: HandsResults) => void): void;
  send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
  close(): void;
}

export interface HandsConstructor {
  new (config: { locateFile: (file: string) => string }): HandsInstance;
}

export interface CameraOptions {
  onFrame: () => Promise<void>;
  width?: number;
  height?: number;
}

export interface CameraInstance {
  start(): void;
  stop(): void;
}

export interface CameraConstructor {
  new (video: HTMLVideoElement, options: CameraOptions): CameraInstance;
}

export interface DrawingStyle {
  color?: string;
  lineWidth?: number;
  radius?: number;
}

export type DrawConnectorsFn = (
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: ReadonlyArray<readonly [number, number]>,
  style?: DrawingStyle,
) => void;

export type DrawLandmarksFn = (
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  style?: DrawingStyle,
) => void;

declare global {
  interface Window {
    Hands?: HandsConstructor;
    Camera?: CameraConstructor;
    drawConnectors?: DrawConnectorsFn;
    drawLandmarks?: DrawLandmarksFn;
    HAND_CONNECTIONS?: ReadonlyArray<readonly [number, number]>;
  }
}
