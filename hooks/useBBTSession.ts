import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { BBTSessionController, type BBTDebugSnapshot, type BBTSessionState, type BBTSessionSummary } from '../features/bbtSession';
import type { HandEngineState } from '../engine/handEngine';
import type { Handedness } from '../lib/recognition';

/** UI-rate timer tick, decoupled from the ~30 FPS MediaPipe frame loop. */
const TICK_INTERVAL_MS = 250;

export interface BBTSession {
  state: BBTSessionState;
  start: (selectedHand: Handedness, durationMs?: number) => void;
  stop: () => BBTSessionSummary;
  exportJson: () => void;
  onGestureStart: (handedness: Handedness, gestureId: string) => void;
  onGestureEnd: (handedness: Handedness, gestureId: string) => void;
  onFrame: (state: HandEngineState) => void;
  /** Reads the controller's current internal rep state directly — diagnostic
   *  only, not piped through React state (see the debug-overlay task notes). */
  getDebugSnapshot: () => BBTDebugSnapshot | null;
}

/**
 * Thin React adapter over {@link BBTSessionController}: the controller owns
 * state and side effects, this hook just wires it to React and to a UI-rate
 * countdown timer.
 */
export function useBBTSession(canvasRef: RefObject<HTMLCanvasElement | null>): BBTSession {
  const controllerRef = useRef<BBTSessionController | null>(null);
  const [state, setState] = useState<BBTSessionState>(() => {
    const controller = new BBTSessionController(
      () => canvasRef.current?.width ?? 0,
      (next) => setState(next),
    );
    controllerRef.current = controller;
    return controller.getState();
  });

  const controller = controllerRef.current!;

  useEffect(() => {
    const id = window.setInterval(() => controller.tick(), TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [controller]);

  const start = useCallback(
    (selectedHand: Handedness, durationMs?: number) => controller.start(selectedHand, durationMs),
    [controller],
  );
  const stop = useCallback(() => controller.stop(), [controller]);
  const exportJson = useCallback(() => controller.exportJson(), [controller]);
  const onGestureStart = useCallback(
    (h: Handedness, g: string) => controller.handleGestureStart(h, g),
    [controller],
  );
  const onGestureEnd = useCallback((h: Handedness, g: string) => controller.handleGestureEnd(h, g), [controller]);
  const onFrame = useCallback((s: HandEngineState) => controller.frame(s.hands), [controller]);
  const getDebugSnapshot = useCallback(() => controller.getDebugSnapshot(), [controller]);

  return { state, start, stop, exportJson, onGestureStart, onGestureEnd, onFrame, getDebugSnapshot };
}
