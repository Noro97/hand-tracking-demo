import type { FC } from 'react';
import { useRef } from 'react';
import { Eye, EyeOff, ScanFace } from 'lucide-react';

import { useFaceTracking } from '../hooks/useFaceTracking';
import { EYE_CLOSED_THRESHOLD, type FaceMetrics } from '../lib/faceMetrics';
import LoadingOverlay from './LoadingOverlay';
import MobileBlocker from './MobileBlocker';

const FaceTrackingDemo: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { loading, faceDetected, metrics } = useFaceTracking(videoRef, canvasRef, containerRef);

  return (
    <div className="flex w-full h-screen bg-page text-text-primary overflow-hidden font-roboto">
      <MobileBlocker />

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />

        {loading && <LoadingOverlay />}

        <FaceHud faceDetected={faceDetected} metrics={metrics} />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Face the camera — the mesh tracks 468 facial landmarks live. Try blinking, opening your mouth,
              smiling, and tilting your head.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaceHud: FC<{ faceDetected: boolean; metrics: FaceMetrics | null }> = ({ faceDetected, metrics }) => (
  <div className="absolute top-6 left-6 z-40 bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[260px]">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-full ${faceDetected ? 'bg-border/40' : 'bg-border/20'}`}>
        <ScanFace className={`w-5 h-5 ${faceDetected ? 'text-accent-blue' : 'text-text-dim'}`} />
      </div>
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Face</p>
        <p className="text-base font-bold">{faceDetected ? 'Detected' : 'Not visible'}</p>
      </div>
    </div>

    {metrics && (
      <div className="flex flex-col gap-1.5 text-sm">
        <EyeRow label="Left eye" openness={metrics.leftEyeOpenness} />
        <EyeRow label="Right eye" openness={metrics.rightEyeOpenness} />
        <Row label="Mouth open" value={`${Math.round(metrics.mouthOpenRatio * 100)}%`} />
        <Row label="Smile" value={metrics.smileRatio.toFixed(2)} />
        <Row label="Head roll" value={`${metrics.headRollDeg.toFixed(0)}°`} />
      </div>
    )}
  </div>
);

const EyeRow: FC<{ label: string; openness: number }> = ({ label, openness }) => {
  const closed = openness < EYE_CLOSED_THRESHOLD;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-text-muted">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono font-medium ${closed ? 'text-accent-yellow' : ''}`}>
        {closed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {closed ? 'Closed' : 'Open'}
      </span>
    </div>
  );
};

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-text-muted">{label}</span>
    <span className="font-mono font-medium">{value}</span>
  </div>
);

export default FaceTrackingDemo;
