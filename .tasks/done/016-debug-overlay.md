# 016 — Диагностическая debug-панель в BBT Rehab

**Status:** done
**Created:** 2026-07-05
**Origin:** user-requested ("strong custom debugging and testing tools")
**Impact:** medium  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Показать сырые диагностические данные прямо в UI (по toggle), чтобы тестирование на реальной камере давало точные баг-репорты ("в 0:23 relDist для thumb-index был 0.38, хендедность переключилась Left→Right на кадре N") вместо расплывчатых ("руки перепутались"). Задача 015 закрывает автоматическую верификацию логики без камеры; эта задача — инструмент для быстрой, информативной РУЧНОЙ верификации на реальной камере, когда она всё же нужна.

## Context
`HandObservation.gestures` — уже булево, но исходное `relDist` (нормализованное расстояние thumb↔finger) нигде не выставляется наружу. `BBTSessionController` не exposes своё внутреннее состояние (`pendingSince`, `candidateHandedness`, `pathLengthPx` текущего rep) — это ровно то, что нужно видеть, чтобы диагностировать relabel-баги в реальном времени.

## Решения (план, не финал — уточнить при реализации)
- `HandRecognizer.recognize()` уже вычисляет `rel` в цикле — добавить его в `HandObservation` как `gestureDistances: Record<string, number>` (дёшево, никакого нового вычисления).
- `BBTSessionController` получает `getDebugSnapshot()` — возвращает `{ trackedHandedness, pendingSince, candidateHandedness, pathLengthPx }` текущего `active` rep (или null). Не троттлить отдельно — опрашивается тем же `tick()`-циклом (~4 Гц), который уже существует в `useBBTSession`, никакого нового таймера.
- UI: свёрнутая по умолчанию панель (иконка/кнопка "Debug"), не засорять основной HUD для клинического использования.
- **Не троттлить `gestureDistances` через React state на 30 Гц** — то же правило, что и для pointer/path (см. `.agents/AGENTS.md`, RETRO про троттлинг). Если панель открыта, читать текущее значение из ref/сырого объекта на каждый рендер debug-панели, не гонять через `useState` на частоте камеры.

## Checklist
- [x] `lib/recognition.ts`: `HandObservation.gestureDistances` добавлен (сырой `rel` перед hysteresis/debounce, вычисляется в существующем цикле — нулевые доп. вычисления).
- [x] `features/bbtSession.ts`: `getDebugSnapshot()` добавлен (`BBTDebugSnapshot`: trackedHandedness, pendingForMs, candidateHandedness, pathLengthPx).
- [x] `components/BBTSessionDemo.tsx`: togglable debug-панель (иконка Bug, bottom-left) — per-hand relDist + pinched/open, tracked/candidate hand, pending-for-ms, path length.
- [x] `npx tsc --noEmit` чист.
- [x] `npm run build` без ошибок (бандл 215.45 → 217.94 kB).
- [x] `npm run test` зелёный — 30/30, добавление `gestureDistances` потребовало обновить `hand()`-фабрику в `features/bbtSession.test.ts` (TS strict поймал бы несоответствие и без теста, но тест тоже актуализирован).
- [x] Dev-сервер/preview: кнопка переключает панель (проверено через `preview_eval` — click + className до/после), панель рендерит все поля с `—` при отсутствии активной сессии/руки, основной HUD не сломан.

## Notes
- **Не троттлил `gestureDistances`/`getDebugSnapshot()` отдельным таймером** — панель просто читает текущие значения при каждом ре-рендере, который и так происходит от уже существующих троттлированных источников: `hands` обновляется через `onState` движка (~100мс), `getDebugSnapshot()` вызывается заново при каждом ре-рендере компонента (включая тот, что триггерит `tick()` каждые ~250мс во время сессии). Ноль новых setInterval/setState — именно то, что было зафиксировано в плане задачи.
- Живая проверка того, что панель реально помогает диагностировать relabel в реальном времени на настоящей камере — не сделана (нет камеры в headless). Структурно панель показывает именно те поля, которые нужны для диагностики бага "руки перепутались" (tracked/candidate hand, pending-for-ms) — но подтверждение полезности на практике за пользователем.

## Verification
- `npx tsc --noEmit` → exit 0.
- `npm run test` → 30/30.
- `npm run build` → `✓ built in 574ms`.
- Preview: debug-кнопка кликабельна, панель появляется с ожидаемым содержимым ("No hand detected", все поля "—" в состоянии без активной сессии), консоль — только ожидаемый `NotAllowedError`.
