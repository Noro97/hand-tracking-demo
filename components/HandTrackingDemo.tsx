/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { Point } from '../types';
import { Loader2, Hand, Activity, Monitor } from 'lucide-react';

const PINCH_THRESHOLD = 0.05;
const HUD_UPDATE_INTERVAL_MS = 100;

const HandTrackingDemo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHudUpdateRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [handDetected, setHandDetected] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    let camera: any = null;
    let hands: any = null;

    const onResults = (results: any) => {
      setLoading(false);

      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(18, 18, 18, 0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let detected = false;
      let pinching = false;
      let pos: Point | null = null;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        detected = true;
        const landmarks = results.multiHandLandmarks[0];
        const idxTip = landmarks[8];
        const thumbTip = landmarks[4];

        pos = {
          x: ((idxTip.x + thumbTip.x) / 2) * canvas.width,
          y: ((idxTip.y + thumbTip.y) / 2) * canvas.height,
        };

        const dx = idxTip.x - thumbTip.x;
        const dy = idxTip.y - thumbTip.y;
        const pinchDist = Math.sqrt(dx * dx + dy * dy);
        pinching = pinchDist < PINCH_THRESHOLD;

        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#669df6', lineWidth: 2 });
          window.drawLandmarks(ctx, landmarks, { color: '#aecbfa', lineWidth: 1, radius: 3 });
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pinching ? 28 : 20, 0, Math.PI * 2);
        ctx.strokeStyle = pinching ? '#66bb6a' : '#ffffff';
        ctx.lineWidth = pinching ? 3 : 2;
        ctx.stroke();

        if (pinching) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#66bb6a';
          ctx.fill();
        }
      }

      ctx.restore();

      const now = performance.now();
      if (now - lastHudUpdateRef.current > HUD_UPDATE_INTERVAL_MS) {
        lastHudUpdateRef.current = now;
        setHandDetected(detected);
        setIsPinching(pinching);
        setPointer(pos);
      }
    };

    if (window.Hands) {
      hands = new window.Hands({
        locateFile: (file: string) => `/mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onResults);
      if (window.Camera) {
        camera = new window.Camera(video, {
          onFrame: async () => {
            if (videoRef.current && hands) await hands.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      }
    }

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, []);

  return (
    <div className="flex w-full h-screen bg-[#121212] overflow-hidden font-roboto text-[#e3e3e3]">

      <div className="fixed inset-0 z-[100] bg-[#121212] flex flex-col items-center justify-center p-8 text-center md:hidden">
        <Monitor className="w-16 h-16 text-[#ef5350] mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-[#e3e3e3] mb-4">Desktop View Required</h2>
        <p className="text-[#c4c7c5] max-w-md text-lg leading-relaxed">
          This experience requires a larger screen and webcam.
        </p>
      </div>

      <div ref={containerRef} className="flex-1 relative h-full overflow-hidden">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#121212] z-50">
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-[#42a5f5] animate-spin mb-4" />
              <p className="text-[#e3e3e3] text-lg font-medium">Starting camera…</p>
            </div>
          </div>
        )}

        <div className="absolute top-6 left-6 z-40">
          <div className="bg-[#1e1e1e] p-5 rounded-[28px] border border-[#444746] shadow-2xl flex flex-col gap-3 min-w-[260px]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${handDetected ? 'bg-[#66bb6a]/20' : 'bg-[#444746]/40'}`}>
                <Hand className={`w-5 h-5 ${handDetected ? 'text-[#66bb6a]' : 'text-[#757575]'}`} />
              </div>
              <div>
                <p className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Hand</p>
                <p className="text-base font-bold">{handDetected ? 'Detected' : 'Not visible'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isPinching ? 'bg-[#fdd835]/20' : 'bg-[#444746]/40'}`}>
                <Activity className={`w-5 h-5 ${isPinching ? 'text-[#fdd835]' : 'text-[#757575]'}`} />
              </div>
              <div>
                <p className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Gesture</p>
                <p className="text-base font-bold">{isPinching ? 'Pinch' : 'Open'}</p>
              </div>
            </div>

            <div className="mt-1 pt-3 border-t border-[#444746] text-xs text-[#c4c7c5] font-mono">
              Pointer: {pointer ? `${Math.round(pointer.x)}, ${Math.round(pointer.y)}` : '—'}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
          <div className="bg-[#1e1e1e]/90 px-6 py-3 rounded-full border border-[#444746] backdrop-blur-sm">
            <p className="text-sm text-[#e3e3e3] text-center">
              Bring your hand into the camera. Pinch your index finger and thumb to highlight the pointer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandTrackingDemo;
