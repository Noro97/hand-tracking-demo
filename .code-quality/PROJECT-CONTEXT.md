# Project context — hand-tracking-demo

Conventions and known non-issues for this repo. Read before auditing; don't flag the items below.

## Deliberate patterns (do NOT flag)
- **MediaPipe loaded via `window` globals** (`window.Hands`, `window.Camera`, `window.drawConnectors`, `window.HAND_CONNECTIONS`), declared in `types.ts` and loaded by `<script>` tags in `index.html` from `public/mediapipe/`. This is intentional: legacy `@mediapipe/hands` is unreliable as an ESM import; UMD globals + same-origin assets (copied by `scripts/copy-mediapipe.mjs` on postinstall) are the robust path. Do not suggest converting to `import`.
- **`alert()` override in `index.html`** suppresses MediaPipe camera_utils' alert on getUserMedia failure. Intentional.
- **Canvas/video CSS `scaleX(-1)`** mirrors the feed for a selfie feel. Because MediaPipe processes the un-mirrored frame, handedness is swapped in `engine/handEngine.ts` (`SWAP_HANDEDNESS`). This is correct, not a bug.

## Architecture (post Phase 0–2 refactor)
Layered: `detection (MediaPipe)` → `recognition (lib/recognition.ts)` → `dispatch (engine events)` → `actions (features/interactionController.ts)` → `render` → `state (hook → HUD)`. The engine (`engine/handEngine.ts`) is framework-agnostic; `hooks/useHandTracking.ts` adapts it to React, `hooks/useHandInteractions.ts` owns the interaction controller. Gestures are declarative data in `lib/gestures.ts`; gesture→action bindings in `lib/actions.ts`.

The engine has two output cadences: `onFrame` (every frame, for smooth drawing) and `onState` (throttled 100ms, for the React HUD). Drawing happens on a second stacked `<canvas>` (`drawCanvasRef`) the controller owns; the engine canvas is video+overlay only. Both canvases inherit `scaleX(-1)` from the global `canvas` rule in `index.html`, so strokes mirror-align with the pointer; snapshots re-apply the flip when compositing.

## Verification limits
This is a webcam app. The headless preview has no camera, so live hand/gesture behavior cannot be verified automatically — it stalls on the "Starting camera…" overlay (expected). Verify two-hand and gesture behavior on a real webcam.

## Known follow-ups
- (resolved) Engine-restart-on-render risk: `useHandInteractions` memoizes all forwarded callbacks with `useCallback`, so `useHandTracking`'s effect deps are stable.
- Gesture thresholds for thumb→ring/pinky reuse the index pinch constants (`PINCH_ENTER_REL` etc.). Ring/pinky may be harder to trigger on some hands; per-gesture overrides live in `lib/gestures.ts`.
- A fist (all fingertips near thumb) can fire multiple thumb-touch gestures at once — inherent to the distance model; refine later if it causes misfires.
