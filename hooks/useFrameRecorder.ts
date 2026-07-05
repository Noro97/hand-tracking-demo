import { RefObject, useCallback, useRef, useState } from 'react';

import type { RawHandFrame } from '../engine/handEngine';
import { fixtureFileName, type RecordedFixture, type RecordedFrame } from '../lib/fixtures';

export interface FrameRecorder {
  recording: boolean;
  hasRecording: boolean;
  start: () => void;
  stop: () => void;
  download: () => void;
  onRawFrame: (hands: RawHandFrame[], timestampMs: number) => void;
}

/**
 * Buffers raw per-hand landmarks from `HandEngine.onRawFrame` into a
 * downloadable fixture (see `lib/fixtures.ts`) for `features/replay.ts` to
 * consume headlessly later. `onRawFrame`'s identity must stay stable across
 * start/stop — it's a dependency of `useHandTracking`'s effect, and a
 * changing identity would restart the camera every time recording toggles.
 * So "is recording active" lives in a ref (checked inside the stable
 * callback), with `recording`/`hasRecording` React state only for the UI.
 */
export function useFrameRecorder(canvasRef: RefObject<HTMLCanvasElement | null>): FrameRecorder {
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const recordingRef = useRef(false);
  const framesRef = useRef<RecordedFrame[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const fixtureRef = useRef<RecordedFixture | null>(null);

  const start = useCallback(() => {
    framesRef.current = [];
    startTimeRef.current = null;
    fixtureRef.current = null;
    recordingRef.current = true;
    setHasRecording(false);
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);

    const frames = framesRef.current;
    if (frames.length === 0) return;
    const canvas = canvasRef.current;
    fixtureRef.current = {
      meta: {
        recordedAt: Date.now(),
        durationMs: frames[frames.length - 1]?.tMs ?? 0,
        canvasWidth: canvas?.width ?? 0,
        canvasHeight: canvas?.height ?? 0,
      },
      frames,
    };
    setHasRecording(true);
  }, [canvasRef]);

  const download = useCallback(() => {
    const fixture = fixtureRef.current;
    if (!fixture) return;
    const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fixtureFileName(fixture);
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const onRawFrame = useCallback((hands: RawHandFrame[], timestampMs: number) => {
    if (!recordingRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = timestampMs;
    framesRef.current.push({ tMs: timestampMs - startTimeRef.current, hands });
  }, []);

  return { recording, hasRecording, start, stop, download, onRawFrame };
}
