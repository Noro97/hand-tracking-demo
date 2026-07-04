import { RefObject, useCallback, useRef, useState } from 'react';

import { InteractionController, type InteractionState } from '../features/interactionController';
import type { HandEngineState } from '../engine/handEngine';
import type { Handedness } from '../lib/recognition';

export interface HandInteractions {
  state: InteractionState;
  onGestureStart: (handedness: Handedness, gestureId: string) => void;
  onGestureEnd: (handedness: Handedness, gestureId: string) => void;
  onFrame: (state: HandEngineState) => void;
  getEffect: () => InteractionState['effect'];
}

/**
 * Owns an {@link InteractionController} and exposes stable callbacks for
 * {@link useHandTracking} plus reactive UI state for the toolbar. Callbacks are
 * memoized so the engine effect doesn't restart on every render.
 */
export function useHandInteractions(
  drawCanvasRef: RefObject<HTMLCanvasElement | null>,
  videoCanvasRef: RefObject<HTMLCanvasElement | null>,
): HandInteractions {
  const controllerRef = useRef<InteractionController | null>(null);
  const [state, setState] = useState<InteractionState>(() => {
    const controller = new InteractionController(
      () => drawCanvasRef.current,
      () => videoCanvasRef.current,
      (next) => setState(next),
    );
    controllerRef.current = controller;
    return controller.getState();
  });

  const controller = controllerRef.current!;

  const onGestureStart = useCallback(
    (h: Handedness, g: string) => controller.handleGestureStart(h, g),
    [controller],
  );
  const onGestureEnd = useCallback(
    (h: Handedness, g: string) => controller.handleGestureEnd(h, g),
    [controller],
  );
  const onFrame = useCallback((s: HandEngineState) => controller.frame(s.hands), [controller]);
  const getEffect = useCallback(() => controller.getEffect(), [controller]);

  return { state, onGestureStart, onGestureEnd, onFrame, getEffect };
}
