# 015 — Vitest + детерминированные тесты чистой логики

**Status:** done
**Created:** 2026-07-05
**Origin:** user-requested ("strong custom debugging and testing tools... so agent could repair itself")
**Impact:** high  **Effort:** M  **Risk:** low
**Blocked by:** none

## Goal
Дать агенту (и пользователю) способ детерминированно проверять логику распознавания жестов/повторов BBT БЕЗ реальной камеры. Сейчас единственный способ верификации — чтение кода и рассуждение руками (как это было сделано для relabel-толерантности в задаче 014) — это медленно и не ловит регрессии. Vitest покрывает чистый логический слой (`lib/filters.ts`, `lib/geometry.ts`, `lib/recognition.ts`, `features/bbtSession.ts`), который не зависит от DOM/canvas/камеры — синтетические landmark/frame-последовательности подаются напрямую в классы, результат проверяется assert'ами.

## Context
- Три бага задачи 014 (multi-gesture firing, both-hands-counting, handedness relabel) были найдены пользователем ТОЛЬКО на реальной камере — headless preview этого не видит (ожидаемо для webcam-проекта). Но сама ЛОГИКА (не камера, не canvas, не MediaPipe wasm) — чистый TypeScript, полностью тестируемый синтетическими данными.
- `BBTSessionController` (задача 013/014) — главный объект тестирования: `handleGestureStart`/`handleGestureEnd`/`frame()`/`tick()` принимают примитивы и `HandObservation[]` (plain data, без DOM), не требуют браузера вообще.
- `Date.now()` используется внутри контроллера напрямую (не через инъекцию clock) — для детерминированных тестов используем `vi.useFakeTimers()` вместо рефакторинга публичного API под DI-параметр, который был бы избыточной абстракцией ради единственного тестового потребителя.

## Решения (зафиксированы)
- **Vitest**, не Jest — тот же Vite-экосистема, ноль дополнительного bundler-конфига, ESM-native.
- Тесты **только для чистого логического слоя** в этой задаче (`lib/`, `features/bbtSession.ts`). `engine/handEngine.ts` (DOM/canvas/MediaPipe globals) и React-компоненты/хуки — вне скоупа этой задачи (низкая ценность на unit-уровне, в основном glue-код; при необходимости — отдельная задача с jsdom+canvas-mock).
- **`vi.useFakeTimers()`** для детерминированного контроля `Date.now()` внутри `BBTSessionController`, вместо добавления injectable-clock параметра в публичный конструктор.
- Тестовые fixtures для landmarks — простые фабрики (`makeLandmarks({thumbTip, indexTip, ...})`), не полные 21-точечные MediaPipe-дампы — тестируем только те индексы, которые реально читает тестируемый код.
- Test script: `npm run test` → `vitest run` (одноразовый прогон, не watch — для CI/агента). `npm run test:watch` — для интерактивной разработки.

## Checklist
- [x] `vitest` добавлен в devDependencies (`^4.1.9`), `package.json` получает `"test": "vitest run"` и `"test:watch": "vitest"`.
- [x] `vitest.config.ts` — намеренно НЕ переиспользует `vite.config.ts` (react()/tailwindcss() плагины не нужны чистой логике); `environment: 'node'`, `include: ['**/*.test.ts']`.
- [x] `lib/filters.test.ts` — 10 тестов: OneEuroFilter (raw на первом сэмпле, сглаживание медленных изменений vs быстрых, reset, dt<=0 guard), PinchTracker (debounce отклоняет ранний confirm, hysteresis не мигает между ENTER/EXIT, короткий флик не подтверждается, reset).
- [x] `lib/geometry.test.ts` — 6 тестов: dist (игнорирует z), distPx, handSize (точное значение + guard на отсутствующие landmarks), midpointPx.
- [x] `lib/recognition.test.ts` — 6 тестов: подтверждение thumb-index после debounce, null при отсутствующих landmarks, сглаживание pointer (jump не проходит полностью), retainOnly сбрасывает per-hand state (без сброса — псевдо-подтверждение осталось бы), две руки независимы.
- [x] `features/bbtSession.test.ts` (главный фокус) — 8 тестов, все синтетические сценарии из плана реализованы, включая **прямую регрессию для фикса задачи 014**: `tolerates a brief handedness relabel and counts the transfer as one rep` и `rejects a resume candidate that is too far away, without corrupting the original rep`.
- [x] `npx tsc --noEmit` чист (exit 0, тестовые файлы тоже проходят typecheck).
- [x] `npm run test` → 30/30 зелёных, 4 файла.
- [x] `npm run build` без ошибок; бандл размер не изменился (215.45 kB) — подтверждает, что `.test.ts` файлы не попадают в production-сборку (не импортируются из `index.tsx`/`App.tsx`-дерева, специальный exclude не потребовался).

## Notes
- `Date.now()` внутри `BBTSessionController` контролируется через `vi.useFakeTimers()` + `vi.setSystemTime()`, а не через injectable-clock параметр в конструкторе — избежали лишнего API-поверхности ради единственного тестового потребителя (см. Решения выше).
- `exportJson()` НЕ протестирован — использует `document.createElement`/`URL.createObjectURL` (browser-only API), недоступные в `environment: 'node'`. Низкая ценность юнит-тестирования (тонкая browser-side-effect обёртка вокруг уже протестированного `buildSummary`/`lastSummary`); добавление jsdom ради одной функции — не оправдано в этой задаче.
- `engine/handEngine.ts` и React-компоненты/хуки остались непротестированными (намеренно, см. Решения) — в основном glue-код (DOM/canvas/MediaPipe globals), низкая ценность на unit-уровне; отдельная задача с jsdom+canvas-mock, если понадобится.

## Verification
- `npx tsc --noEmit` → exit 0.
- `npm run test` → `Test Files 4 passed (4)`, `Tests 30 passed (30)`.
- `npm run build` → `✓ built in 719ms`, бандл 215.45 kB (без изменений от добавления тестов).
