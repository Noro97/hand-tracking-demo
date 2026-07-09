import { RefObject, useEffect, useState } from 'react';

import { FaceEngine, type FaceEngineState } from '../engine/faceEngine';

export interface FaceTrackingState {
  loading: boolean;
  faceDetected: boolean;
  metrics: FaceEngineState['metrics'];
}

/** Thin React adapter over {@link FaceEngine}, mirroring useHandTracking. */
export function useFaceTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
): FaceTrackingState {
  const [loading, setLoading] = useState(true);
  const [engineState, setEngineState] = useState<FaceEngineState>({ faceDetected: false, metrics: null });

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const engine = new FaceEngine(video, canvas, container, {
      onReady: () => setLoading(false),
      onState: setEngineState,
    });
    engine.start();

    return () => engine.stop();
  }, [videoRef, canvasRef, containerRef]);

  return { loading, faceDetected: engineState.faceDetected, metrics: engineState.metrics };
}
