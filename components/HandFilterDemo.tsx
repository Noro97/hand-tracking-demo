import type { FC } from 'react';
import { useRef } from 'react';
import { Hand } from 'lucide-react';

import { useActiveFilters } from '../hooks/useActiveFilters';
import { useHandTracking } from '../hooks/useHandTracking';
import { useSceneEffect } from '../hooks/useSceneEffect';
import { HAND_FILTERS } from '../lib/filterRenderers';
import { SCENE_EFFECTS } from '../lib/sceneEffects';
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
  const sceneEffect = useSceneEffect();
  const { loading, hands } = useHandTracking(videoRef, canvasRef, containerRef, {
    getActiveFilters: filters.getActiveFilters,
    getActiveSceneEffect: sceneEffect.getActiveSceneEffect,
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

        <FilterPicker
          sections={[
            { title: 'Filters', items: HAND_FILTERS, active: filters.active, onToggle: filters.toggle },
            {
              title: 'Screen',
              items: SCENE_EFFECTS,
              active: sceneEffect.active ? [sceneEffect.active] : [],
              onToggle: sceneEffect.select,
            },
          ]}
        />

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Toggle a filter and show your hands — it follows your fingers. Pick a Screen effect and raise BOTH
              hands to stretch a stylized display between them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandFilterDemo;
