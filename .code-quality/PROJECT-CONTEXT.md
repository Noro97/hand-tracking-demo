# Project context — hand-tracking-demo

Conventions and known non-issues for this repo. Read before auditing; don't flag the items below.

## Deliberate patterns (do NOT flag)

- **MediaPipe loaded via `window` globals** (`window.Hands`, `window.FaceMesh`, `window.Camera`, `window.drawConnectors`, `window.HAND_CONNECTIONS`, `window.FACEMESH_*`), declared in `types.ts`, loaded by `<script>` tags in `index.html` from `public/mediapipe/`. Intentional: the legacy MediaPipe packages are unreliable as ESM imports; UMD globals + same-origin assets (copied by `scripts/copy-mediapipe.mjs` on postinstall) are the robust path. Do not suggest converting to `import`.
- **`alert()` override in `index.html`** suppresses MediaPipe camera_utils' alert on getUserMedia failure. Intentional.
- **Canvas/video CSS `scaleX(-1)`** mirrors the feed for a selfie feel. Because MediaPipe processes the un-mirrored frame, handedness is swapped in `engine/handEngine.ts` (`SWAP_HANDEDNESS`). Correct, not a bug. Two consequences that are also deliberate: canvas renderers avoid text and asymmetric glyphs, and `quadFromHands` orders corners by canvas-x rather than by handedness label.
- **`optimizeDeps.exclude: ['onnxruntime-web']`** in `vite.config.ts` is required — esbuild pre-bundling rewrites ORT's dynamic wasm loading and breaks `initWasm()` in dev. Do not "tidy" it away.
- **No `ort.env.wasm.wasmPaths`** — Vite resolves ORT's wasm through the module graph and emits it as a hashed asset. Pointing wasmPaths at a `public/` copy makes ORT *import* from `public/`, which Vite rejects.
- **Two disabled ESLint rules** (`react-hooks/refs`, `react-hooks/immutability`) — React-Compiler-oriented rules from eslint-plugin-react-hooks v7 that flag the deliberate "lazily built controller cached in a ref" pattern. This project does not use the Compiler.
- **`FILTERS` / `SCENE_EFFECTS` registries are data, not branching.** Adding an entry is a data edit — that is the design.
- **Symmetric-only ASCII glyph ramp** in `lib/sceneEffects.ts`, enforced by a test, because the canvas is mirrored.

## Architecture (current)

```
detection (MediaPipe window globals)
  → recognition   lib/recognition.ts               smoothing, gesture state, handedness score gate
  → dispatch      lib/gestureEventDispatcher.ts    per-frame booleans → start/end edges
  → features      features/{bbtSession,shootingGame,replay}.ts   DOM-free state machines
  → render        engine/{handEngine,faceEngine}.ts + features/*Renderer.ts
  → React         hooks/use*.ts → components/*Demo.tsx
```

Four screens (`App.tsx`): BBT Rehab (clinical core), Face Tracking, Hand Filters, Shooting.

Two engines exist in parallel (`HandEngine`, `FaceEngine`) by deliberate choice — a shared base class was judged premature at two consumers. `HandEngine` can additionally drive Face Mesh **lazily** on the same camera (one camera, two models) for in-frame face filters; a second `Camera` instance over the same `<video>` would fight for frames.

`HandEngine` has two output cadences: `onFrame` (every frame, unthrottled) and `onState` (throttled 100 ms, for the React HUD). Games and scene effects draw on their own stacked canvases; the engine canvas holds video + landmarks + per-hand filters.

## Verification limits

This is a webcam app. The headless preview has **no camera**, so live hand/face/gesture behavior cannot be verified automatically — it stalls on "Starting camera…" (expected). Two rules learned the hard way here:

- **Verify through the app's real module path**, not a parallel direct call to the underlying library. Importing the ORT bundle directly "passed" while the app's actual worker path was broken in two separate ways.
- Never report gesture behavior as working on the strength of a passing type-check.

## Known follow-ups

Tracked in `.tasks/BACKLOG.md`, including the still-open audit findings (BBT persisted-relabel [HIGH], scene-effect smoothing reset [MEDIUM], engine/screen duplication, dead exports). Check the backlog before reporting any of those as new.
