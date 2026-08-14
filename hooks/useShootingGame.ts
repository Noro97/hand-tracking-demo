import { RefObject, useCallback, useRef, useState } from 'react';

import { ShootingGameController, type ShootingGameState } from '../features/shootingGame';
import { renderShootingGame } from '../features/shootingGameRenderer';
import type { HandEngineState } from '../engine/handEngine';

export interface ShootingGame {
  state: ShootingGameState;
  start: () => void;
  stop: () => void;
  onFrame: (state: HandEngineState) => void;
}

/**
 * React adapter over {@link ShootingGameController}, mirroring
 * useHandInteractions' old shape: the controller owns game state, this hook
 * wires it to the engine's per-frame callback and paints the stacked canvas.
 *
 * `onFrame` keeps a stable identity (state is read via ref) so toggling the
 * game never recreates the engine and restarts the camera — the task-017
 * lesson that also governs the recorder and filter callbacks.
 */
export function useShootingGame(gameCanvasRef: RefObject<HTMLCanvasElement | null>): ShootingGame {
  const controllerRef = useRef<ShootingGameController | null>(null);
  const [state, setState] = useState<ShootingGameState>(() => {
    const controller = new ShootingGameController((next) => setState(next));
    controllerRef.current = controller;
    return controller.getState();
  });

  const controller = controllerRef.current!;

  const start = useCallback(() => controller.start(), [controller]);
  const stop = useCallback(() => controller.stop(), [controller]);

  const onFrame = useCallback(
    (engineState: HandEngineState) => {
      const canvas = gameCanvasRef.current;
      if (!canvas) return;

      // Match the engine canvas's backing size, else hit maths and pixels disagree.
      const { clientWidth, clientHeight } = canvas;
      if (clientWidth > 0 && (canvas.width !== clientWidth || canvas.height !== clientHeight)) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
      }

      controller.frame(engineState.hands, canvas.width, canvas.height);

      const ctx = canvas.getContext('2d');
      if (ctx) renderShootingGame(ctx, controller.getState(), Date.now());
    },
    [controller, gameCanvasRef],
  );

  return { state, start, stop, onFrame };
}
