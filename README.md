# Hand Tracking Demo

Interactive webcam-based hand tracking built on Vite, React, and MediaPipe Hands. The demo renders a mirrored camera feed with live 21-point hand landmarks and a pinch-gesture indicator. No game logic, no AI, no API keys.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000/ and grant camera permission.

## Stack

- Vite 6 + React 19 + TypeScript
- MediaPipe Hands `0.4.1646424915` served locally from `public/mediapipe/`
- Tailwind CSS via CDN
- lucide-react icons

## Project state

See `.tasks/` for the work plan, `STATE.md` for stack and Definition of Done, and `RETRO.md` for accumulated lessons.

The host directory (`projects/gemini-slingshot`) still carries the legacy name; only the npm package was renamed in this pass.
