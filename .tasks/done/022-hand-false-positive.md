# 022 — Ложное распознавание руки на лице (false positive на рту)

**Status:** done
**Created:** 2026-07-10
**Origin:** user-reported bug со скриншотом с реальной камеры: hand-скелет + подтверждённый pinch (зелёный круг) на рту/бороде пользователя на BBT-экране
**Impact:** high (может засорять клинические BBT-измерения фантомными жестами)  **Effort:** S  **Risk:** low
**Blocked by:** none

## Diagnosis
Известный failure mode MediaPipe Hands: текстуры лица (рот/борода) на дефолтном `minDetectionConfidence: 0.5` иногда проходят как «рука». На скриншоте фантомная «рука» не просто отрисовалась — она подтвердила pinch (прошла PinchTracker debounce), то есть держалась стабильно. Прямого вреда счёту блоков почти нет (лицо статично — не пересечёт перегородку и не наберёт MIN_TRANSFER_PATH_PX), но: (а) фантом занимает слот handedness и может вытеснить/спутать реальную руку (`present.has()` dedup), (б) визуальный шум прямо на лице, (в) недопустимо для клинического инструмента.

## Решения (зафиксированы)
- **Подняты пороги детекции движка:** `minDetectionConfidence` 0.5 → **0.75**, `minTrackingConfidence` 0.5 → **0.7** (именованные константы `MIN_DETECTION_CONFIDENCE`/`MIN_TRACKING_CONFIDENCE` наверху `engine/handEngine.ts`, tunable-комментарий). Trade-off задокументирован: если РЕАЛЬНЫЕ руки перестанут детектиться в тусклом свете — сначала опускать detection-порог.
- **Score-gate в recognizer, НЕ в движке:** MediaPipe отдаёт per-hand `multiHandedness[i].score` (confidence классификации), который мы раньше игнорировали. Новый гейт `MIN_HANDEDNESS_SCORE = 0.8` живёт в `HandRecognizer.recognize()` (новый опциональный параметр `handednessScore`, default 1) — сознательно в recognizer, а не в engine-цикле, чтобы headless replay применял ТО ЖЕ отсечение (no-drift правило задачи 017).
- **Score в диагностике и фикстурах:** `HandObservation.handednessScore` показывается в debug-панели (`Left/Right score`); `RawHandFrame.score` записывается в фикстуры — face-as-hand false positive воспроизводим replay'ем только если его низкий score захвачен. `features/replay.ts` прокидывает score в recognize.

## Checklist
- [x] `engine/handEngine.ts`: пороги 0.75/0.7 (именованные константы), score из `multiHandedness[i].score ?? 1` → `recognize()` и `RawHandFrame`.
- [x] `lib/recognition.ts`: `MIN_HANDEDNESS_SCORE = 0.8` (exported), гейт в `recognize()`, `HandObservation.handednessScore`.
- [x] `features/replay.ts`: score из фикстуры → recognize (гейт реплеится).
- [x] `components/BBTSessionDemo.tsx` (debug-панель): строка `<hand> score` per hand.
- [x] Тест-фабрики обновлены (`hand()`, `obs()`, `rightHand()` — новые обязательные поля).
- [x] +3 регрессионных теста в `lib/recognition.test.ts`: score ниже гейта → null (идеально pinch-образные landmarks — именно кейс с багом), score на границе/default → принят, score виден на observation.
- [x] tsc / lint / test (54, было 51) / build зелёные; debug-панель рендерится в preview без ошибок.

## Notes
- **Числа 0.75/0.7/0.8 — стартовая калибровка**, не финал (прецедент 009/014). Проверка за пользователем на той же камере/освещении, где был баг: (а) фантом на рту исчез? (б) реальные руки всё ещё детектятся? Если фантом остался — debug-панель теперь показывает его score (сообщить число), и можно записать фикстуру (Record в debug-панели) — score теперь в записи, баг станет headless-воспроизводимым.
- Формат фикстур изменился (добавлен обязательный `score` в `RawHandFrame`) — реальных записанных фикстур ещё не существует, ломать нечего.

## Verification
- `npx tsc --noEmit` → 0; `npm run lint` → 0; `npm run test` → 54/54; `npm run build` → ✓.
- Preview: debug-панель открывается, без `undefined` в выводе, консоль — только ожидаемый `NotAllowedError`.
- Живая проверка на реальной камере (исчез ли фантом, не отвалились ли реальные руки) — за пользователем.

## Retro
**Rating:** _(ожидает оценки пользователя)_
