import { RefObject, useEffect, useState } from 'react';

import { HandEngine, type HandEngineCallbacks } from '../engine/handEngine';
import type { HandObservation } from '../lib/recognition';

export interface HandTrackingState {
  loading: boolean;
  hands: HandObservation[];
}

/**
 * Thin React adapter over {@link HandEngine}. The engine owns the camera loop,
 * recognition, and canvas rendering; this hook just mirrors its state for the
 * HUD and forwards optional gesture callbacks.
 */
type ForwardedCallbacks = Pick<
  HandEngineCallbacks,
  'onGestureStart' | 'onGestureEnd' | 'onFrame' | 'getEffect'
>;

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  callbacks?: ForwardedCallbacks,
): HandTrackingState {
  const [loading, setLoading] = useState(true);
  const [hands, setHands] = useState<HandObservation[]>([]);

  const { onGestureStart, onGestureEnd, onFrame, getEffect } = callbacks ?? {};

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const engine = new HandEngine(video, canvas, container, {
      onReady: () => setLoading(false),
      onState: (state) => setHands(state.hands),
      onGestureStart,
      onGestureEnd,
      onFrame,
      getEffect,
    });
    engine.start();

    return () => engine.stop();
  }, [videoRef, canvasRef, containerRef, onGestureStart, onGestureEnd, onFrame, getEffect]);

  return { loading, hands };
}
