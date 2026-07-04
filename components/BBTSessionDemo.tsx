import type { FC } from 'react';
import { useRef, useState } from 'react';
import { Bug, Download, Play, Square, Timer } from 'lucide-react';

import { useHandTracking } from '../hooks/useHandTracking';
import { useBBTSession } from '../hooks/useBBTSession';
import type { BBTDebugSnapshot, BBTRep } from '../features/bbtSession';
import type { HandObservation, Handedness } from '../lib/recognition';
import LoadingOverlay from './LoadingOverlay';
import MobileBlocker from './MobileBlocker';

const DURATION_OPTIONS_MS = [30_000, 60_000, 120_000] as const;
const DEFAULT_DURATION_MS: (typeof DURATION_OPTIONS_MS)[number] = 60_000;
const HAND_OPTIONS: Handedness[] = ['Left', 'Right'];

const BBTSessionDemo: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [durationMs, setDurationMs] = useState<(typeof DURATION_OPTIONS_MS)[number]>(DEFAULT_DURATION_MS);
  const [pendingHand, setPendingHand] = useState<Handedness>('Left');
  const [debugOpen, setDebugOpen] = useState(false);

  const session = useBBTSession(canvasRef);
  const { loading, hands } = useHandTracking(videoRef, canvasRef, containerRef, {
    onGestureStart: session.onGestureStart,
    onGestureEnd: session.onGestureEnd,
    onFrame: session.onFrame,
  });

  const hasResults = !session.state.running && session.state.reps.length > 0;

  return (
    <div className="flex w-full h-screen bg-page text-text-primary overflow-hidden font-roboto">
      <MobileBlocker />

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />
        <PartitionLine />

        {loading && <LoadingOverlay />}

        <SessionHud
          running={session.state.running}
          selectedHand={session.state.selectedHand}
          remainingMs={session.state.remainingMs}
          blockCount={session.state.blockCount}
          lastRep={session.state.lastRep}
        />

        <Controls
          running={session.state.running}
          hasResults={hasResults}
          durationMs={durationMs}
          onDurationChange={setDurationMs}
          pendingHand={pendingHand}
          onHandChange={setPendingHand}
          onStart={() => session.start(pendingHand, durationMs)}
          onStop={() => session.stop()}
          onExport={() => session.exportJson()}
        />

        <button
          type="button"
          onClick={() => setDebugOpen((open) => !open)}
          className={`absolute bottom-6 left-6 z-40 p-3 rounded-full border shadow-2xl ${
            debugOpen
              ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
              : 'bg-surface border-border text-text-muted'
          }`}
          aria-label="Toggle debug panel"
        >
          <Bug className="w-4 h-4" />
        </button>

        {debugOpen && <DebugPanel hands={hands} debug={session.getDebugSnapshot()} />}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-surface/90 px-6 py-3 rounded-full border border-border backdrop-blur-sm">
            <p className="text-sm text-text-primary text-center">
              Pick the hand under test, then pinch thumb + index on one side of the line, carry across, and release
              on the other side — each crossing counts as one block. Only the selected hand is tracked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Visual midline the user must carry a pinch across. Not a canvas element, so it is unaffected by the
 *  global `canvas { scaleX(-1) }` mirror rule — it always sits at the true visual center. */
const PartitionLine: FC = () => (
  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 z-30 flex w-px pointer-events-none">
    <div className="w-px h-full bg-accent-yellow/70" />
    <span className="absolute top-6 -translate-x-[calc(100%+12px)] text-xs tracking-wider text-text-muted uppercase">
      Compartment A
    </span>
    <span className="absolute top-6 translate-x-3 text-xs tracking-wider text-text-muted uppercase">
      Compartment B
    </span>
  </div>
);

const SessionHud: FC<{
  running: boolean;
  selectedHand: Handedness | null;
  remainingMs: number;
  blockCount: number;
  lastRep: BBTRep | null;
}> = ({ running, selectedHand, remainingMs, blockCount, lastRep }) => (
  <div className="absolute top-6 left-6 z-40 flex flex-col gap-3">
    <div className="bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[260px]">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-border/40">
          <Timer className={`w-5 h-5 ${running ? 'text-accent-green' : 'text-text-dim'}`} />
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            {selectedHand ? `${selectedHand} hand · Time remaining` : 'Time remaining'}
          </p>
          <p className="text-2xl font-bold font-mono">{formatClock(remainingMs)}</p>
        </div>
      </div>
      <Row label="Blocks transferred" value={String(blockCount)} />
    </div>

    {lastRep && (
      <div className="bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[260px]">
        <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">Last rep</p>
        <Row label="Duration" value={`${Math.round(lastRep.durationMs)} ms`} />
        <Row label="Smoothness" value={`${Math.round(lastRep.smoothness * 100)}%`} />
        <Row label="Speed" value={`${Math.round(lastRep.speedPxPerSec)} px/s`} />
      </div>
    )}
  </div>
);

/**
 * Raw diagnostics for real-camera debugging: per-hand thumb-index distance
 * (before hysteresis/debounce) and the controller's internal rep state
 * (tracked/pending/candidate handedness). Not throttled independently — it
 * re-renders whenever `hands` (engine HUD state, ~100ms) or the session tick
 * (~250ms) already re-render this component, per the project's
 * no-independent-high-frequency-state rule.
 */
const DebugPanel: FC<{ hands: HandObservation[]; debug: BBTDebugSnapshot | null }> = ({ hands, debug }) => (
  <div className="absolute bottom-20 left-6 z-40 bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[260px] text-xs font-mono">
    <p className="text-text-muted uppercase tracking-wider mb-2">Debug</p>
    {hands.length === 0 && <p className="text-text-dim">No hand detected</p>}
    {hands.map((hand) => (
      <Row
        key={hand.handedness}
        label={`${hand.handedness} relDist`}
        value={
          hand.gestureDistances['thumb-index'] === undefined
            ? '—'
            : `${hand.gestureDistances['thumb-index'].toFixed(2)} (${hand.gestures['thumb-index'] ? 'pinched' : 'open'})`
        }
      />
    ))}
    <Row label="Tracked hand" value={debug?.trackedHandedness ?? '—'} />
    <Row label="Candidate hand" value={debug?.candidateHandedness ?? '—'} />
    <Row label="Pending for" value={debug?.pendingForMs === null || debug?.pendingForMs === undefined ? '—' : `${debug.pendingForMs}ms`} />
    <Row label="Path length" value={debug ? `${Math.round(debug.pathLengthPx)}px` : '—'} />
  </div>
);

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm py-1">
    <span className="text-text-muted">{label}</span>
    <span className="font-mono font-medium">{value}</span>
  </div>
);

const Controls: FC<{
  running: boolean;
  hasResults: boolean;
  durationMs: number;
  onDurationChange: (ms: (typeof DURATION_OPTIONS_MS)[number]) => void;
  pendingHand: Handedness;
  onHandChange: (hand: Handedness) => void;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
}> = ({ running, hasResults, durationMs, onDurationChange, pendingHand, onHandChange, onStart, onStop, onExport }) => (
  <div className="absolute top-6 right-6 z-40">
    <div className="bg-surface p-4 rounded-[24px] border border-border shadow-2xl min-w-[220px] flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">Hand under test</span>
        <div className="flex gap-1">
          {HAND_OPTIONS.map((hand) => (
            <button
              key={hand}
              type="button"
              disabled={running}
              onClick={() => onHandChange(hand)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border disabled:opacity-50 ${
                pendingHand === hand
                  ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                  : 'bg-border/20 border-border text-text-muted'
              }`}
            >
              {hand}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between text-sm">
        <span className="text-text-muted">Session length</span>
        <select
          className="bg-border/30 border border-border rounded-lg px-2 py-1 text-sm font-mono disabled:opacity-50"
          value={durationMs}
          disabled={running}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            const match = DURATION_OPTIONS_MS.find((ms) => ms === parsed);
            onDurationChange(match ?? DEFAULT_DURATION_MS);
          }}
        >
          {DURATION_OPTIONS_MS.map((ms) => (
            <option key={ms} value={ms}>
              {ms / 1000}s
            </option>
          ))}
        </select>
      </label>

      {running ? (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center justify-center gap-2 bg-accent-red/20 border border-accent-red text-accent-red rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Square className="w-4 h-4" /> Stop session
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="flex items-center justify-center gap-2 bg-accent-green/20 border border-accent-green text-accent-green rounded-xl px-3 py-2 text-sm font-medium"
        >
          <Play className="w-4 h-4" /> Start session
        </button>
      )}

      <button
        type="button"
        onClick={onExport}
        disabled={!hasResults}
        className="flex items-center justify-center gap-2 bg-border/20 border border-border text-text-primary rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
      >
        <Download className="w-4 h-4" /> Export JSON
      </button>
    </div>
  </div>
);

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default BBTSessionDemo;
