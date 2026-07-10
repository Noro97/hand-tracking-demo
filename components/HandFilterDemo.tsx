import type { FC } from 'react';
import { useRef } from 'react';
import { Hand } from 'lucide-react';

import { useActiveFilters } from '../hooks/useActiveFilters';
import { useHandTracking } from '../hooks/useHandTracking';
import { HAND_FILTERS } from '../lib/filterRenderers';
import FilterPicker from './FilterPicker';
import LoadingOverlay from './LoadingOverlay';
import MobileBlocker from './MobileBlocker';

/**
 * Playground screen for hand AR filters — deliberately separate from the
 * clinical BBT screen, which stays free of showcase features.
 */
const HandFilterDemo: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filters = useActiveFilters();
  const { loading, hands } = useHandTracking(videoRef, canvasRef, containerRef, {
    getActiveFilters: filters.getActiveFilters,
  });

  return (
    <div className="flex w-full h-screen bg-page text-text-primary overflow-hidden font-roboto">
      <MobileBlocker />

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />

        {loading && <LoadingOverlay />}

        <div className="absolute top-6 left-6 z-40 bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[220px]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${hands.length > 0 ? 'bg-border/40' : 'bg-border/20'}`}>
              <Hand className={`w-5 h-5 ${hands.length > 0 ? 'text-accent-yellow' : 'text-text-dim'}`} />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Hands</p>
              <p className="text-base font-bold">{hands.length > 0 ? `${hands.length} detected` : 'Not visible'}</p>
            </div>
          </div>
        </div>

        <FilterPicker filters={HAND_FILTERS} active={filters.active} onToggle={filters.toggle} />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Show your hands to the camera and toggle a filter — it follows your fingers live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandFilterDemo;
