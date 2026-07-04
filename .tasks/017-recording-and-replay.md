# 017 — Запись реальных landmark-сессий + headless replay

**Status:** planned (not started this session — see Notes)
**Created:** 2026-07-05
**Origin:** user-requested ("strong custom debugging and testing tools... so agent could repair itself")
**Impact:** high  **Effort:** L  **Risk:** low
**Blocked by:** none (independent of 015/016, but most valuable once both exist)

## Goal
Задачи 015/016 дают: (а) детерминированные тесты на СИНТЕТИЧЕСКИХ данных, (б) удобную ручную диагностику на реальной камере. Но синтетические фикстуры — это МОИ (агента) предположения о том, как выглядит баг, не гарантированно совпадающие с реальным MediaPipe-выводом на реальной камере пользователя. Эта задача закрывает разрыв: пользователь записывает РЕАЛЬНУЮ проблемную последовательность жестов один раз на своей камере → сохраняет как JSON-фикстуру → агент прогоняет её headless (без камеры) сколько угодно раз, воспроизводит баг детерминированно, чинит, проверяет фикс на ТОЙ ЖЕ фикстуре — настоящий "agent repairs itself" цикл, а не предположения.

## Планируемый дизайн (не финализирован — уточнить при реализации)
1. **Recording:** в `engine/handEngine.ts` — опциональный `onRawFrame?: (frame: { multiHandLandmarks, multiHandedness, timestamp }) => void` callback, вызываемый в `onResults()` до всей остальной обработки (сырые данные MediaPipe, а не производные `HandObservation`). В UI — toggle "Record" в debug-панели (задача 016): пока включен, копит массив сырых кадров в ref; "Stop & Download" сохраняет как JSON (`bbt-recording-<timestamp>.json`).
2. **Формат фикстуры:** `{ meta: { recordedAt, durationMs, note? }, frames: Array<{ tMs: number, hands: Array<{ handedness: 'Left'|'Right', landmarks: {x,y,z}[21] }> }> }` — `tMs` относительное время от начала записи (не абсолютные timestamps — переносимо между машинами).
3. **Replay harness:** Node/Vitest-скрипт (`scripts/replay-fixture.ts` или тест-хелпер в `features/bbtSession.test.ts`), который читает JSON-фикстуру, прогоняет каждый кадр через `HandRecognizer.recognize()` → `BBTSessionController.frame()`/`handleGestureStart`/`handleGestureEnd` (эмулируя то, что делает `HandEngine.onResults()`, но headless, без canvas/camera), и печатает/assert'ит итоговый `BBTSessionSummary`.
4. **Where fixtures live:** `test/fixtures/*.json`, в git (маленькие JSON-файлы, не бинарные — коммитятся нормально).

## Почему не сделано в этой сессии
Требует: (а) изменения `engine/handEngine.ts` (новый callback) — трогает уже стабильный, недавно дособранный слой; (б) реальную запись пользователем НА РЕАЛЬНОЙ КАМЕРЕ, которую агент не может создать сам — то есть первая полезная фикстура появится только после того, как пользователь реально запишет свой relabel-баг. Смысла блокировать задачи 015/016 (которые полностью самодостаточны и приносят пользу прямо сейчас) на этом не было. План зафиксирован здесь, чтобы не потерять контекст дизайна между сессиями.

## Checklist (для будущей реализации)
- [ ] `engine/handEngine.ts`: `onRawFrame` callback.
- [ ] `hooks/useHandTracking.ts`: прокидывает `onRawFrame`.
- [ ] `components/BBTSessionDemo.tsx` (debug-панель из 016): Record/Stop/Download UI.
- [ ] Формат фикстуры задокументирован (см. выше), схема провалидирована хотя бы вручную на одной реальной записи.
- [ ] Replay-хелпер (`scripts/` или тестовый util), `test/fixtures/` с хотя бы одной реальной фикстурой от пользователя.
- [ ] `npx tsc --noEmit`, `npm run build`, `npm run test` зелёные.

## Notes
Следующий шаг после этой сессии: пользователь тестирует задачи 015/016 (особенно debug-панель) на реальной камере; если баг воспроизводится — записывает сессию через будущий Record-toggle (задача 017) и передаёт JSON агенту как фикстуру.
