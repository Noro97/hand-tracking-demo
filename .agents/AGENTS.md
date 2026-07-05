# Hand Tracking Demo Workspace Rules

These workspace-scoped rules guide all agent behaviors in this repository.

## General Preferences
- **Language**: All task logs, status updates, retrospective logs (`RETRO.md`), strategic briefs, and conversation-related markdown artifacts MUST be written in **Russian**. Technical identifiers, variable names, function names, types, comments, and strings in the code MUST be written in **English**.
- **Git Commits**: All changes in the `.tasks/` directory must be committed to git as part of the repository's development history.
- **DoD (Definition of Done)**:
  - `npm run build` must compile without errors.
  - `npx tsc --noEmit` must be clean.
  - No leftover debugging statements, `console.log` calls, or commented-out blocks should remain in the production code.
  - No unused imports or variables should remain.

## Tech Stack & Architecture Rules
- **MediaPipe globals**: Always load MediaPipe Hands via window globals. Do not use ESM imports.
- **Handedness mapping**: The engine internally swaps handedness (`SWAP_HANDEDNESS = true`) to align with the CSS mirrored view (`scaleX(-1)`).
- **Performance**: High-frequency updates should use refs. React states should only be used for low-frequency HUD states (throttled).
- **Scale Invariance**: All gesture detection distance checks must be relative to the hand size (distance between landmark 0 and landmark 9).
