import { RefObject, useEffect, useState } from 'react';

import { FaceEngine, type FaceEngineCallbacks, type FaceEngineState } from '../engine/faceEngine';

export interface FaceTrackingState {
  loading: boolean;
  faceDetected: boolean;
  metrics: FaceEngineState['metrics'];
}

type ForwardedCallbacks = Pick<FaceEngineCallbacks, 'getActiveFilters'>;

/** Thin React adapter over {@link FaceEngine}, mirroring useHandTracking. */
export function useFaceTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  callbacks?: ForwardedCallbacks,
): FaceTrackingState {
  const [loading, setLoading] = useState(true);
  const [engineState, setEngineState] = useState<FaceEngineState>({ faceDetected: false, metrics: null });

  const { getActiveFilters } = callbacks ?? {};

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const engine = new FaceEngine(video, canvas, container, {
      onReady: () => setLoading(false),
      onState: setEngineState,
      getActiveFilters,
    });
    engine.start();

    return () => engine.stop();
  }, [videoRef, canvasRef, containerRef, getActiveFilters]);

  return { loading, faceDetected: engineState.faceDetected, metrics: engineState.metrics };
}
