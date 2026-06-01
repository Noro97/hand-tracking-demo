import { RefObject, useEffect, useRef, useState } from 'react';

import {
  ONE_EURO_BETA,
  ONE_EURO_D_CUTOFF,
  ONE_EURO_MIN_CUTOFF,
  OneEuroFilter,
  PINCH_DEBOUNCE_MS,
  PINCH_ENTER_REL,
  PINCH_EXIT_REL,
  PinchTracker,
} from '../lib/filters';
import {
  COLORS,
  POINTER_DOT_RADIUS,
  POINTER_RADIUS_IDLE,
  POINTER_RADIUS_PINCH,
} from '../lib/colors';
import type {
  CameraInstance,
  HandsInstance,
  HandsResults,
  Point,
} from '../types';

const HUD_UPDATE_INTERVAL_MS = 100;

// Landmark indices in MediaPipe Hands output (21 landmarks per hand).
const LM_WRIST = 0;
const LM_THUMB_TIP = 4;
const LM_INDEX_TIP = 8;
const LM_MIDDLE_MCP = 9;

export interface HandTrackingState {
  loading: boolean;
  handDetected: boolean;
  isPinching: boolean;
  pointer: Point | null;
}

/**
 * Drives the MediaPipe Hands camera loop and renders to the provided canvas.
 * Returns a throttled state mirror suitable for HUD rendering.
 */
export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
): HandTrackingState {
  const [loading, setLoading] = useState(true);
  const [handDetected, setHandDetected] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);

  const lastHudUpdateRef = useRef(0);
  const hasReportedReadyRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      canvas.width = width;
      canvas.height = height;
    });
    resizeObserver.observe(container);

    const filterX = new OneEuroFilter(ONE_EURO_MIN_CUTOFF, ONE_EURO_BETA, ONE_EURO_D_CUTOFF);
    const filterY = new OneEuroFilter(ONE_EURO_MIN_CUTOFF, ONE_EURO_BETA, ONE_EURO_D_CUTOFF);
    const pinchTracker = new PinchTracker(PINCH_ENTER_REL, PINCH_EXIT_REL, PINCH_DEBOUNCE_MS);

    let mounted = true;
    let camera: CameraInstance | null = null;
    let hands: HandsInstance | null = null;

    const onResults = (results: HandsResults) => {
      if (!mounted) return;

      if (!hasReportedReadyRef.current) {
        hasReportedReadyRef.current = true;
        setLoading(false);
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLORS.videoOverlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      let detected = false;
      let pinching = false;
      let pos: Point | null = null;

      const landmarks = results.multiHandLandmarks?.[0];
      const wrist = landmarks?.[LM_WRIST];
      const thumbTip = landmarks?.[LM_THUMB_TIP];
      const idxTip = landmarks?.[LM_INDEX_TIP];
      const middleMcp = landmarks?.[LM_MIDDLE_MCP];

      if (landmarks && wrist && thumbTip && idxTip && middleMcp) {
        detected = true;

        const handSize = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
        const pinchDist = Math.hypot(idxTip.x - thumbTip.x, idxTip.y - thumbTip.y);
        const relPinchDist = handSize > 1e-6 ? pinchDist / handSize : pinchDist;

        pinching = pinchTracker.update(relPinchDist, now);

        const rawX = ((idxTip.x + thumbTip.x) / 2) * canvas.width;
        const rawY = ((idxTip.y + thumbTip.y) / 2) * canvas.height;
        pos = {
          x: filterX.filter(rawX, now),
          y: filterY.filter(rawY, now),
        };

        const drawConnectors = window.drawConnectors;
        const drawLandmarks = window.drawLandmarks;
        const handConnections = window.HAND_CONNECTIONS;
        if (drawConnectors && drawLandmarks && handConnections) {
          drawConnectors(ctx, landmarks, handConnections, {
            color: COLORS.landmarkLine,
            lineWidth: 2,
          });
          drawLandmarks(ctx, landmarks, {
            color: COLORS.landmarkPoint,
            lineWidth: 1,
            radius: 3,
          });
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pinching ? POINTER_RADIUS_PINCH : POINTER_RADIUS_IDLE, 0, Math.PI * 2);
        ctx.strokeStyle = pinching ? COLORS.accentGreen : COLORS.cursorIdle;
        ctx.lineWidth = pinching ? 3 : 2;
        ctx.stroke();

        if (pinching) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, POINTER_DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.accentGreen;
          ctx.fill();
        }
      } else {
        filterX.reset();
        filterY.reset();
        pinchTracker.reset();
      }

      ctx.restore();

      if (now - lastHudUpdateRef.current > HUD_UPDATE_INTERVAL_MS) {
        lastHudUpdateRef.current = now;
        setHandDetected(detected);
        setIsPinching(pinching);
        setPointer(pos);
      }
    };

    const HandsCtor = window.Hands;
    const CameraCtor = window.Camera;
    if (HandsCtor && CameraCtor) {
      hands = new HandsCtor({
        locateFile: (file) => `/mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onResults);

      camera = new CameraCtor(video, {
        onFrame: async () => {
          if (hands && videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }

    return () => {
      mounted = false;
      resizeObserver.disconnect();
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, [videoRef, canvasRef, containerRef]);

  return { loading, handDetected, isPinching, pointer };
}
