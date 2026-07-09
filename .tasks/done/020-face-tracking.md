# 020 — Face tracking: MediaPipe Face Mesh + лицевые метрики

**Status:** done
**Created:** 2026-07-06
**Origin:** user-requested ("добавить то же самое для обнаружения лиц... распознавание деталей лица")
**Impact:** high  **Effort:** M  **Risk:** low
**Blocked by:** none

*(Номера 018/019 живут на других ветках: 018 — clinician dashboard, приостановлена; 019 — ESLint, PR #2.)*

## Goal
Распознавание лица тем же паттерном, что и руки: MediaPipe Face Mesh (468 landmarks) через UMD window-глобалы, локальные ассеты, framework-agnostic движок, чистый тестируемый слой метрик, отдельный экран "Face Tracking" рядом с "BBT Rehab". Это фундамент для задачи 021 (фильтры на руки и лица).

**Скоуп-заметка:** фильтры на лицо/руки — showcase/AR-направление, отдельный трек от medtech-ядра (BBT). Лицевой трекинг сам по себе полезен шире (стратегический бриф упоминает мимику в жестовых сценариях), но клинический BBT-экран НЕ тронут этой задачей.

## Решения (зафиксированы)
- **`@mediapipe/face_mesh@0.4.1633559619`** — последняя 0.4.x (у face_mesh нет версии, синхронной с hands 0.4.1646424915 — у каждого solution свой релизный цикл; несовпадение номеров нормально, оба одного поколения UMD-solutions).
- **Тот же asset-паттерн:** `scripts/copy-mediapipe.mjs` расширен `'face_mesh'` (+16.2 МБ, итого 40 МБ в `public/mediapipe/`, git-ignored, регенерация через postinstall); `<script src="/mediapipe/face_mesh/face_mesh.js">` в `index.html`.
- **Параллельный `FaceEngine`** (`engine/faceEngine.ts`), НЕ расширение `HandEngine` — у решений разные конструкторы/результаты/рендер; общий кусок (canvas setup, resize, ready-flag, HUD-троттлинг) невелик, преждевременное извлечение базового класса ради двух потребителей не оправдано. Если появится третий движок (pose?) — тогда извлекать.
- **`maxNumFaces: 1`, `refineLandmarks: false`** — один пользователь перед камерой; iris-уточнение (+10 landmarks) не нужно текущим метрикам, экономит CPU. Включить при необходимости iris-фич.
- **Метрики — чистый слой** (`lib/faceMetrics.ts`), scale-invariant ratios по конвенции AGENTS.md (нормировка на ширину глаза/рта/лица, не абсолютные px): eye openness per-eye (EAR-подобный), mouth open ratio, smile ratio, head roll (deg). Индексы именованы в `lib/faceLandmarks.ts` (аналог `lib/landmarks.ts`). 6 юнит-тестов на синтетических landmarks.
- **Переключатель режимов — локальный `useState` в `App.tsx`** (BBT Rehab / Face Tracking) — тот же прецедент, что и в 013: два экрана не оправдывают роутер. Известный принятый trade-off: переключение перезапускает камеру (~1-2с) — тот же техдолг, что был у Draw/BBT-свитчера.
- **"LEFT"/"RIGHT" в faceLandmarks — стороны СУБЪЕКТА** (конвенция MediaPipe), не экрана — зеркалирование `scaleX(-1)` остаётся render-only концерном, как и везде в проекте.

## Checklist
- [x] `@mediapipe/face_mesh` установлен; `scripts/copy-mediapipe.mjs` расширен; ассеты скопированы (12 файлов, 16.2 МБ).
- [x] `types.ts`: `FaceMeshResults/Options/Instance/Constructor` + `window.FaceMesh`/`FACEMESH_TESSELATION`/`FACEMESH_CONTOURS`.
- [x] `index.html`: script-тег face_mesh.js.
- [x] `lib/faceLandmarks.ts` (именованные индексы), `lib/faceMetrics.ts` (чистые метрики), `lib/faceMetrics.test.ts` (6 тестов: null при отсутствии landmarks, eye openness, blink threshold, mouth open, smile, head roll).
- [x] `engine/faceEngine.ts` — по паттерну HandEngine (tesselation тонкими линиями + contours ярче, HUD-троттлинг 100мс).
- [x] `hooks/useFaceTracking.ts`, `components/FaceTrackingDemo.tsx` (HUD: face detected, per-eye open/closed, mouth %, smile, roll°).
- [x] `App.tsx`: переключатель BBT Rehab / Face Tracking.
- [x] `lib/colors.ts`: `faceMeshLine`/`faceContourLine`.
- [x] `npx tsc --noEmit` чист.
- [x] `npm run test` — 43/43 (было 37, +6).
- [x] `npm run build` — без ошибок, бандл 220.68 → 229.06 kB (+8.4 kB UI/движок; сами ML-ассеты вне бандла).
- [x] Preview: переключатель работает, Face-экран рендерит HUD "Not visible" (корректный null-state без камеры), face_mesh.js загружается без failed requests, консоль — только ожидаемый `NotAllowedError`.

## Notes
- Живая проверка метрик (реальные пороги blink/smile на реальном лице) — за пользователем на реальной камере; числовые константы (`EYE_CLOSED_THRESHOLD = 0.12`) — стартовые значения по геометрии canonical face model, калибровать по фидбеку (прецедент задачи 009).
- Запись/replay-фикстуры (задача 017) на лицо НЕ распространены — `RawHandFrame`-формат hands-специфичен. Если понадобится "agent repairs itself" для лицевых багов — расширить формат фикстуры отдельной задачей.

## Verification
- `npx tsc --noEmit` → exit 0; `npm run test` → 43/43; `npm run build` → ✓ 628ms.
- Preview: mode-свитчер кликается, оба экрана рендерятся, сеть без failed requests, консоль чистая (кроме ожидаемой камеры).

## Retro
**Rating:** _(ожидает оценки пользователя)_
