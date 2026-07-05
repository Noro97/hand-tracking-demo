---
name: hand-tracking-development
description: Guides development, refactoring, and debugging of hand-tracking features, custom gesture recognizers, and MediaPipe-based interactions in this project.
---

# Hand Tracking Development Skill

Use this skill when developing, refactoring, or troubleshooting hand tracking features, gesture definitions, canvas drawing, and camera interactions in this project.

## Core Architectural Layers

1. **Detection (MediaPipe)**: Hand landmarks are detected using MediaPipe Hands loaded from local assets.
2. **Recognition (`lib/recognition.ts`)**: Stateful recognizer smooths pointer movements with a One Euro Filter and tracks gestures.
3. **Dispatch (`engine/handEngine.ts`)**: Dispatches frame updates and state transitions.
4. **Actions (`features/interactionController.ts`)**: Implements specific interactions like drawing, color changes, and size changes.
5. **Render & State**: Renders output via React components and hooks (`hooks/useHandTracking.ts`, `hooks/useHandInteractions.ts`).

## Critical Codebase Guidelines

### 1. MediaPipe Loading & Globals
- **Do NOT convert MediaPipe script tags to ESM imports**. MediaPipe Hands UMD scripts are loaded via `window` globals (`window.Hands`, `window.Camera`, `window.drawConnectors`, `window.HAND_CONNECTIONS`).
- The assets are served locally from `public/mediapipe/` and are copied via the postinstall script `node scripts/copy-mediapipe.mjs`.

### 2. Camera Mirrored View & Handedness
- The web app mirrors camera feeds and canvases for a natural selfie-like experience using CSS `scaleX(-1)`.
- Because MediaPipe receives raw (un-mirrored) camera frames, it returns the opposite handedness. The engine compensates for this by swapping handedness internally via `SWAP_HANDEDNESS = true` in `engine/handEngine.ts`.
- Ensure any new coordinate-space calculations account for the mirror flip.

### 3. Gesture Scale Invariance
- Thresholds for gesture triggers (like pinching) must be **relative** to the size of the hand in the frame.
- Use `handSize(landmarks)` from `lib/geometry.ts` (distance between wrist landmark 0 and middle finger MCP landmark 9) as the denominator to normalize distances.
- Avoid using absolute normalized landmark coordinate distances, which vary depending on how close the user is to the camera.

### 4. React State Throttling
- The camera loop executes at ~30 FPS. **Do NOT update React state (via `useState`/`setState`) at 30Hz**, as it will degrade performance and cause lag.
- Keep high-frequency updates (e.g. for canvas drawings, pointer coords) inside canvas refs or local variables.
- Throttle React HUD updates to around ~10Hz (100ms) or use ref-based updates.

## Extending Gestures and Actions

- **To define a new gesture**: Add a new `GestureDef` configuration to `GESTURES` in `lib/gestures.ts`. It maps two landmarks (e.g. thumb tip and a finger tip) to an active state using distance thresholds.
- **To bind an action to a gesture**: Update `lib/actions.ts` to connect the gesture ID to a command.
- **To implement interaction logic**: Add the command handler inside `features/interactionController.ts`.

## Verification and Testing
- Headless testing setups cannot access a physical camera; the app will remain in a "Starting camera..." loading overlay during headless runs.
- Use manual device verification on a webcam to test actual tracking performance, responsiveness, and gesture activation.
