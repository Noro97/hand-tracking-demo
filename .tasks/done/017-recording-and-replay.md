# 017 — Запись реальных landmark-сессий + headless replay

**Status:** done (mechanism built; real user fixture still pending — see Notes)
**Created:** 2026-07-05
**Origin:** user-requested ("strong custom debugging and testing tools... so agent could repair itself")
**Impact:** high  **Effort:** L  **Risk:** low
**Blocked by:** none

## Goal
Задачи 015/016 дают: (а) детерминированные тесты на СИНТЕТИЧЕСКИХ данных, (б) удобную ручную диагностику на реальной камере. Но синтетические фикстуры — это МОИ (агента) предположения о том, как выглядит баг, не гарантированно совпадающие с реальным MediaPipe-выводом на реальной камере пользователя. Эта задача закрывает разрыв: пользователь записывает РЕАЛЬНУЮ проблемную последовательность жестов один раз на своей камере → сохраняет как JSON-фикстуру → агент прогоняет её headless (без камеры) сколько угодно раз, воспроизводит баг детерминированно, чинит, проверяет фикс на ТОЙ ЖЕ фикстуре.

## Решения (зафиксированы — отличаются от первоначального плана в паре мест)
- **`GestureEventDispatcher` вынесен из `engine/handEngine.ts` в `lib/gestureEventDispatcher.ts`** (не было в исходном плане) — иначе headless replay был бы РЕИМПЛЕМЕНТАЦИЕЙ edge-detection логики движка, рискуя разойтись с реальным поведением. Теперь `HandEngine` и `features/replay.ts` вызывают ОДИН И ТОТ ЖЕ класс — замена в движке чисто механическая (behavior-preserving), протестирована 5 юнит-тестами, которых раньше не было вообще.
- **`onRawFrame` захватывает данные ПОСЛЕ `resolveHandedness()`, но ДО дедупликации по handedness** — фикстура хранит ту же handedness-семантику, что видит `HandRecognizer`, избегая знания replay о `SWAP_HANDEDNESS`; дедупликация (`present.has()`) — забота движка/replay-цикла, не формата фикстуры.
- **`BBTSessionController` получил injectable `now: () => number` параметр** (по умолчанию `Date.now`) — отход от решения задачи 015 ("не делать DI ради единственного потребителя"), но теперь есть ВТОРОЙ реальный потребитель (`features/replay.ts`), которому нужно управлять временем по меткам фикстуры, а не по реальным часам. Это ровно тот случай, который сама задача 015 отметила как обоснование для DI. Существующие тесты (`vi.useFakeTimers()`) не сломались — они патчат глобальный `Date.now`, на который параметр по умолчанию и ссылается.
- **`onRawFrame`'s identity стабилен (`useCallback` с пустым deps в `hooks/useFrameRecorder.ts`)** — "recording активен" живёт в `useRef`, не в зависимости колбэка, иначе переключение записи triggered бы пересоздание `HandEngine` (перезапуск камеры) через effect-deps в `useHandTracking`. Проверено в preview: total console log count не изменился после Start/Stop recording клика — камера не перезапускалась.
- **Пример-фикстура — программная, не литеральный JSON-файл.** Изначальный план предполагал `test/fixtures/*.json` с реальной записью пользователя. Вместо преждевременного литерального JSON (риск рассинхронизации с реальным debounce-таймингом при ручном наборе чисел) — `features/replay.test.ts` строит фикстуру ПРОГРАММНО (цикл, учитывающий debounce PinchTracker'а), что одновременно (а) тестирует `replayFixture()` end-to-end корректно, (б) служит живой документацией формата. `test/fixtures/` с РЕАЛЬНОЙ записью пользователя — всё ещё впереди (см. Notes).

## Checklist
- [x] `lib/gestureEventDispatcher.ts` — извлечён из `engine/handEngine.ts`, 5 юнит-тестов.
- [x] `engine/handEngine.ts`: `onRawFrame?: (hands: RawHandFrame[], timestampMs: number) => void` callback; использует `GestureEventDispatcher` вместо инлайн-логики.
- [x] `hooks/useHandTracking.ts`: прокидывает `onRawFrame`.
- [x] `lib/fixtures.ts`: `RecordedFixture`/`RecordedFrame` типы + `fixtureFileName()`.
- [x] `hooks/useFrameRecorder.ts`: буферизация кадров в ref, Start/Stop/Download, стабильный `onRawFrame`.
- [x] `components/BBTSessionDemo.tsx` (debug-панель из 016): секция "Record fixture" — Start/Stop recording, Download fixture (задизейблен до первой записи).
- [x] `features/bbtSession.ts`: `now: () => number` constructor-параметр (DI clock) — все внутренние `Date.now()` заменены на `this.now()`.
- [x] `features/replay.ts`: `replayFixture(fixture, options)` — прогоняет фикстуру через `HandRecognizer` + `GestureEventDispatcher` + `BBTSessionController` с fixture-driven clock.
- [x] `features/replay.test.ts` — программная smoke-test фикстура (полный debounce-aware цикл: pinch-confirm → carry across → release-confirm → grace-expiry), 2 теста (валидный transfer засчитан; жест от невыбранной руки — нет).
- [x] `npx tsc --noEmit` чист.
- [x] `npm run test` — 37/37 (было 30, +5 dispatcher +2 replay).
- [x] `npm run build` без ошибок (бандл 217.94 → 220.68 kB).
- [x] Preview: Record/Stop toggle работает без перезапуска камеры (проверено по неизменному счётчику console-логов до/после клика); Download задизейблен без захваченных кадров (ожидаемо в headless — нет камеры).

## Notes
- **Реальной фикстуры от пользователя всё ещё нет.** `test/fixtures/` с настоящей записью — следующий реальный шаг: пользователь открывает debug-панель на реальной камере, нажимает Start recording, воспроизводит проблемный жест (например, релейбл рук), Stop → Download fixture, передаёт JSON-файл агенту. Тогда можно добавить его в `test/fixtures/` и написать fixture-специфичный тест поверх `replayFixture()`, воспроизводящий именно этот баг детерминированно.
- **`meta.canvasWidth`/`canvasHeight`** записываются из реального `canvas.width`/`height` в момент `stop()` — критично для партиции-математики при replay (partition = canvasWidth/2). Если пользователь меняет размер окна ПОСРЕДИ записи, зафиксированное значение будет неточным для той части сессии до resize — известное ограничение, не решено в этой задаче (низкий приоритет: resize посреди 30-60с BBT-сессии — редкий сценарий).
- Разница между "задача выполнена" и "цикл замкнут": сам МЕХАНИЗМ (record → fixture → replay → детерминированный баг-репродукшн) полностью готов и протестирован на синтетике; но реальная ценность ("agent repairs itself" на РЕАЛЬНОМ баге) материализуется только когда пользователь фактически что-то запишет и пришлёт.

## Verification
- `npx tsc --noEmit` → exit 0.
- `npm run test` → `Test Files 6 passed (6)`, `Tests 37 passed (37)`.
- `npm run build` → `✓ built in 605ms`, бандл 220.68 kB.
- Preview: debug-панель → Record fixture секция рендерится, Start/Stop recording переключаются без побочных эффектов (камера не перезапускается — total console entries не изменился), Download fixture корректно задизейблен без захваченных кадров.
