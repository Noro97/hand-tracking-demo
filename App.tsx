import type { FC } from 'react';
import { useState } from 'react';

import BBTSessionDemo from './components/BBTSessionDemo';
import HandTrackingDemo from './components/HandTrackingDemo';

type Mode = 'draw' | 'bbt';

const App: FC = () => {
  const [mode, setMode] = useState<Mode>('draw');

  return (
    <div className="relative w-full h-screen">
      <ModeSwitcher mode={mode} onChange={setMode} />
      {mode === 'draw' ? <HandTrackingDemo /> : <BBTSessionDemo />}
    </div>
  );
};

const ModeSwitcher: FC<{ mode: Mode; onChange: (mode: Mode) => void }> = ({ mode, onChange }) => (
  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex bg-surface border border-border rounded-full p-1 gap-1">
    <ModeButton active={mode === 'draw'} onClick={() => onChange('draw')} activeClass="bg-accent-blue text-page">
      Draw Demo
    </ModeButton>
    <ModeButton active={mode === 'bbt'} onClick={() => onChange('bbt')} activeClass="bg-accent-green text-page">
      BBT Rehab
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
