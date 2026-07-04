import type { FC, ReactNode } from 'react';
import { useRef } from 'react';
import { Eraser, Hand, Loader2, Monitor, Pencil, Sparkles } from 'lucide-react';

import { useHandTracking } from '../hooks/useHandTracking';
import { useHandInteractions } from '../hooks/useHandInteractions';
import type { InteractionState } from '../features/interactionController';
import { lookupAction } from '../lib/actions';
import { BRUSH_COLORS, BRUSH_SIZES } from '../lib/colors';
import { GESTURES } from '../lib/gestures';
import type { HandObservation, Handedness } from '../lib/recognition';

const HandTrackingDemo: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const interactions = useHandInteractions(drawCanvasRef, canvasRef);
  const { loading, hands } = useHandTracking(videoRef, canvasRef, containerRef, {
    onGestureStart: interactions.onGestureStart,
    onGestureEnd: interactions.onGestureEnd,
    onFrame: interactions.onFrame,
    getEffect: interactions.getEffect,
  });

  return (
    <div className="flex w-full h-screen bg-page text-text-primary overflow-hidden font-roboto">
      <MobileBlocker />

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />
        <canvas ref={drawCanvasRef} className="absolute inset-0 pointer-events-none" />

        {loading && <LoadingOverlay />}

        <StatusPanel hands={hands} />
        <Toolbar state={interactions.state} />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Right hand draws &amp; tools · Left hand modifies. Touch thumb to a fingertip to fire each action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileBlocker: FC = () => (
  <div className="fixed inset-0 z-[100] bg-page flex flex-col items-center justify-center p-8 text-center md:hidden">
    <Monitor className="w-16 h-16 text-accent-red mb-6 animate-pulse" />
    <h2 className="text-2xl font-bold text-text-primary mb-4">Desktop View Required</h2>
    <p className="text-text-muted max-w-md text-lg leading-relaxed">
      This experience requires a larger screen and webcam.
    </p>
  </div>
);

const LoadingOverlay: FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-page z-50">
    <div className="flex flex-col items-center">
      <Loader2 className="w-12 h-12 text-accent-blue animate-spin mb-4" />
      <p className="text-text-primary text-lg font-medium">Starting camera…</p>
    </div>
  </div>
);

const HAND_ORDER: Handedness[] = ['Left', 'Right'];

const StatusPanel: FC<{ hands: HandObservation[] }> = ({ hands }) => (
  <div className="absolute top-6 left-6 z-40 flex flex-col gap-3">
    {HAND_ORDER.map((handedness) => (
      <HandCard
        key={handedness}
        handedness={handedness}
        obs={hands.find((h) => h.handedness === handedness) ?? null}
      />
    ))}
  </div>
);

const HandCard: FC<{ handedness: Handedness; obs: HandObservation | null }> = ({ handedness, obs }) => {
  const detected = obs !== null;
  const tint = handedness === 'Left' ? 'text-accent-blue' : 'text-accent-yellow';
  const role = handedness === 'Left' ? 'Modifiers' : 'Tools';

  return (
    <div className="bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[260px]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-full ${detected ? 'bg-border/40' : 'bg-border/20'}`}>
          <Hand className={`w-5 h-5 ${detected ? tint : 'text-text-dim'}`} />
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            {handedness} · {role}
          </p>
          <p className="text-base font-bold">{detected ? 'Detected' : 'Not visible'}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {GESTURES.map((g) => {
          const active = obs?.gestures[g.id] === true;
          const action = lookupAction(handedness, g.id);
          return (
            <div
              key={g.id}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                active
                  ? 'bg-accent-green/20 border-accent-green text-accent-green'
                  : 'bg-border/20 border-border text-text-muted'
              }`}
            >
              <span className="font-mono">T+{g.label}</span>
              <span className="font-medium">{action?.label ?? '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Toolbar: FC<{ state: InteractionState }> = ({ state }) => (
  <div className="absolute top-6 right-6 z-40">
    <div className="bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[200px] flex flex-col gap-3">
      <Row
        icon={state.eraser ? <Eraser className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        label="Mode"
        value={!state.drawingEnabled ? 'Drawing off' : state.eraser ? 'Eraser' : 'Pen'}
        muted={!state.drawingEnabled}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted uppercase tracking-wider">Brush</span>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full border border-border"
            style={{ backgroundColor: BRUSH_COLORS[state.colorIndex] }}
          />
          <span className="text-sm font-mono">{BRUSH_SIZES[state.sizeIndex]}px</span>
        </div>
      </div>
      <Row icon={<Sparkles className="w-4 h-4" />} label="Effect" value={state.effect} />
    </div>
  </div>
);

const Row: FC<{ icon: ReactNode; label: string; value: string; muted?: boolean }> = ({
  icon,
  label,
  value,
  muted,
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
    <span className={`flex items-center gap-1.5 text-sm font-medium ${muted ? 'text-text-dim' : ''}`}>
      {icon}
      <span className="capitalize">{value}</span>
    </span>
  </div>
);

export default HandTrackingDemo;
