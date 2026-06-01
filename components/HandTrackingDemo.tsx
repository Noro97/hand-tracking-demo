import type { FC, ReactNode } from 'react';
import { useRef } from 'react';
import { Activity, Hand, Loader2, Monitor } from 'lucide-react';

import { useHandTracking } from '../hooks/useHandTracking';

const HandTrackingDemo: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { loading, handDetected, isPinching, pointer } = useHandTracking(
    videoRef,
    canvasRef,
    containerRef,
  );

  return (
    <div className="flex w-full h-screen bg-page text-text-primary overflow-hidden font-roboto">
      <MobileBlocker />

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />

        {loading && <LoadingOverlay />}

        <StatusPanel handDetected={handDetected} isPinching={isPinching} pointer={pointer} />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Bring your hand into the camera. Pinch your index finger and thumb to highlight the pointer.
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

interface StatusPanelProps {
  handDetected: boolean;
  isPinching: boolean;
  pointer: { x: number; y: number } | null;
}

const StatusPanel: FC<StatusPanelProps> = ({ handDetected, isPinching, pointer }) => (
  <div className="absolute top-6 left-6 z-40">
    <div className="bg-surface p-5 rounded-[28px] border border-border shadow-2xl flex flex-col gap-3 min-w-[260px]">
      <StatusRow
        label="Hand"
        value={handDetected ? 'Detected' : 'Not visible'}
        icon={<Hand className={`w-5 h-5 ${handDetected ? 'text-accent-green' : 'text-text-dim'}`} />}
        active={handDetected}
        activeTint="bg-accent-green/20"
      />
      <StatusRow
        label="Gesture"
        value={isPinching ? 'Pinch' : 'Open'}
        icon={<Activity className={`w-5 h-5 ${isPinching ? 'text-accent-yellow' : 'text-text-dim'}`} />}
        active={isPinching}
        activeTint="bg-accent-yellow/20"
      />
      <div className="mt-1 pt-3 border-t border-border text-xs text-text-muted font-mono">
        Pointer: {pointer ? `${Math.round(pointer.x)}, ${Math.round(pointer.y)}` : '—'}
      </div>
    </div>
  </div>
);

interface StatusRowProps {
  label: string;
  value: string;
  icon: ReactNode;
  active: boolean;
  activeTint: string;
}

const StatusRow: FC<StatusRowProps> = ({ label, value, icon, active, activeTint }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-full ${active ? activeTint : 'bg-border/40'}`}>{icon}</div>
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  </div>
);

export default HandTrackingDemo;
