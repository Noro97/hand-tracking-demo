# 016 — Диагностическая debug-панель в BBT Rehab

**Status:** planned
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
- [ ] `lib/recognition.ts`: `HandObservation.gestureDistances` добавлен.
- [ ] `features/bbtSession.ts`: `getDebugSnapshot()` добавлен.
- [ ] `components/BBTSessionDemo.tsx`: togglable debug-панель (per-hand relDist, handedness, active rep pending/candidate state).
- [ ] `npx tsc --noEmit` чист.
- [ ] `npm run build` без ошибок.
- [ ] `npm run test` зелёный (не должен сломаться от добавления нового поля в `HandObservation`).
- [ ] Dev-сервер/preview: панель переключается, не ломает основной HUD.

## Notes
_(заполняется по ходу; помечено `planned`, реализация в этой же сессии после задачи 015)_
