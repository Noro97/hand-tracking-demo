import type { FC } from 'react';
import { useState } from 'react';

import BBTSessionDemo from './components/BBTSessionDemo';
import FaceTrackingDemo from './components/FaceTrackingDemo';
import HandFilterDemo from './components/HandFilterDemo';

type Mode = 'bbt' | 'face' | 'hands';

const SCREENS: Record<Mode, FC> = {
  bbt: BBTSessionDemo,
  face: FaceTrackingDemo,
  hands: HandFilterDemo,
};

/**
 * Local screen switcher (a router would be overkill — see task 013's
 * precedent). Known tradeoff: switching unmounts one engine and mounts the
 * other, so the camera restarts (~1-2s) on each switch.
 */
const App: FC = () => {
  const [mode, setMode] = useState<Mode>('bbt');
  const Screen = SCREENS[mode];

  return (
    <div className="relative w-full h-screen">
      <ModeSwitcher mode={mode} onChange={setMode} />
      <Screen />
    </div>
  );
};

const ModeSwitcher: FC<{ mode: Mode; onChange: (mode: Mode) => void }> = ({ mode, onChange }) => (
  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex bg-surface border border-border rounded-full p-1 gap-1">
    <ModeButton active={mode === 'bbt'} onClick={() => onChange('bbt')} activeClass="bg-accent-green/20 text-accent-green">
      BBT Rehab
    </ModeButton>
    <ModeButton active={mode === 'face'} onClick={() => onChange('face')} activeClass="bg-accent-blue/20 text-accent-blue">
      Face Tracking
    </ModeButton>
    <ModeButton active={mode === 'hands'} onClick={() => onChange('hands')} activeClass="bg-accent-yellow/20 text-accent-yellow">
      Hand Filters
    </ModeButton>
  </div>
);

const ModeButton: FC<{
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: string;
}> = ({ active, activeClass, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? activeClass : 'text-text-muted'
    }`}
  >
    {children}
  </button>
);

export default App;
