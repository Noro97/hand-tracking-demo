import type { FC } from 'react';
import { useRef } from 'react';
import { Crosshair, Play, Square } from 'lucide-react';

import { useHandTracking } from '../hooks/useHandTracking';
import { useShootingGame } from '../hooks/useShootingGame';
import type { ShootingGameState } from '../features/shootingGame';
import LoadingOverlay from './LoadingOverlay';
import MobileBlocker from './MobileBlocker';

/**
 * Pistol-gesture shooting game. Kept on its own screen rather than folded into
 * BBT Rehab, which stays a clinical measurement tool.
 */
const ShootingGameDemo: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const game = useShootingGame(gameCanvasRef);
  const { loading } = useHandTracking(videoRef, canvasRef, containerRef, { onFrame: game.onFrame });

  return (
    <div className="flex w-full h-screen bg-page text-text-primary overflow-hidden font-roboto">
      <MobileBlocker />

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />
        <canvas ref={gameCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {loading && <LoadingOverlay />}

        <Scoreboard state={game.state} />

        <div className="absolute top-6 right-6 z-40">
          <div className="bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[200px]">
            {game.state.running ? (
              <button
                type="button"
                onClick={game.stop}
                className="w-full flex items-center justify-center gap-2 bg-accent-red/20 border border-accent-red text-accent-red rounded-xl px-3 py-2 text-sm font-medium"
              >
                <Square className="w-4 h-4" /> End game
              </button>
            ) : (
              <button
                type="button"
                onClick={game.start}
                className="w-full flex items-center justify-center gap-2 bg-accent-green/20 border border-accent-green text-accent-green rounded-xl px-3 py-2 text-sm font-medium"
              >
                <Play className="w-4 h-4" /> Start game
              </button>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Make a pistol — index finger out, other fingers folded. Aim with your finger, then drop your thumb
              onto your fist to shoot. Raise the thumb again to reload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Scoreboard: FC<{ state: ShootingGameState }> = ({ state }) => {
  const accuracy = state.shots > 0 ? Math.round((state.hits / state.shots) * 100) : 0;
  const armed = state.aims.some((aim) => aim.armed);

  return (
    <div className="absolute top-6 left-6 z-40 bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[240px]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-full ${armed ? 'bg-accent-green/20' : 'bg-border/20'}`}>
          <Crosshair className={`w-5 h-5 ${armed ? 'text-accent-green' : 'text-text-dim'}`} />
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            {state.running ? (armed ? 'Armed' : 'Show a pistol hand') : 'Ready'}
          </p>
          <p className="text-2xl font-bold font-mono">{state.score}</p>
        </div>
      </div>

      <Row label="Targets" value={String(state.targets.length)} />
      <Row label="Hits / shots" value={`${state.hits} / ${state.shots}`} />
      <Row label="Accuracy" value={`${accuracy}%`} />
    </div>
  );
};

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm py-1">
    <span className="text-text-muted">{label}</span>
    <span className="font-mono font-medium">{value}</span>
  </div>
);

export default ShootingGameDemo;
