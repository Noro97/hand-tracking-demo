# 003 — Снять игровой слой, оставить интерактивный hand-tracking демо

**Status:** done
**Created:** 2026-05-29
**Origin:** user-requested
**Impact:** high  **Effort:** M  **Risk:** med
**Blocked by:** 002

## Goal
Переработать `components/GeminiSlingshot.tsx` в чистый демонстратор hand tracking: камера + 21 landmark на руку + визуализация скелета (connections) + детектор pinch-жеста + статус-панель. Без рогатки, пузырей, физики, очков, цветовой палитры.

## Context
- После 002 в файле остаются: камера, MediaPipe.Hands, `onResults`, `ballPos`/`anchorPos`/`isPinching`, физика, `drawBubble`, `isNeighbor`, `checkMatches`, `getBubblePos`, `initGrid`, COLOR_CONFIG, COLOR_KEYS, createExplosion, particles.
- Нужно из всего этого: только webcam-фид + landmarks + pinch detection + опционально пинч-курсор.
- `types.ts` останется только `Point` и `declare global Window` для MediaPipe.
- `index.html` `<title>` обновить.
- Имя файла/компонента: новый `components/HandTrackingDemo.tsx`. Старый `GeminiSlingshot.tsx` удалить.
- `App.tsx` обновить импорт.
- Имя пакета `gemini-slingshot` в `package.json` — НЕ трогаем (вне scope).

## Checklist
- [x] Создать `components/HandTrackingDemo.tsx`: setup камеры + MediaPipe.Hands, отрисовка mirrored video + landmarks + connections + индикатор pinch. UI: бейдж Hand (Detected/Not visible), бейдж Gesture (Pinch/Open), координаты Pointer, нижняя инструкция, мобильный блокер.
- [x] `App.tsx`: импорт `HandTrackingDemo` вместо `GeminiSlingshot` (сделано ДО удаления старого файла — урок из 002).
- [x] `index.html`: `<title>` → `Hand Tracking Demo`.
- [x] `types.ts`: убраны `Bubble`, `BubbleColor`, `Particle`. Остались только `Point` + `declare global Window`.
- [x] Удалить `components/GeminiSlingshot.tsx` (последним шагом).
- [x] `npx tsc --noEmit` чист.
- [x] `npm run build` зелёный.
- [x] Визуальная проверка через preview: страница рендерится, нет console errors (кроме camera permission), нет failed requests.
- [x] `README.md` обновлён под новое содержимое (раньше упоминал bubble shooter — поправил).

## Notes
- Новый `HandTrackingDemo.tsx` — 192 строки vs ~1037 строк старого `GeminiSlingshot.tsx` (−81%).
- HUD-обновления (`setHandDetected`/`setIsPinching`/`setPointer`) троттлятся до ~10 Гц через `lastHudUpdateRef`, иначе React будет ре-рендерить на каждом кадре MediaPipe (~30 Гц) — лишняя нагрузка для статуса, который меняется редко.
- Применил урок из 002: импорт в `App.tsx` переключил ДО удаления старого `GeminiSlingshot.tsx` — никаких HMR-ошибок в логах.
- Бандл уменьшился с 209.61 kB → **202.76 kB** (gzip 66.38 → 63.83 kB). Дополнительные −7 kB после удаления игровой логики и неиспользуемых иконок.
- В headless preview виден только loading overlay (`Starting camera…`), потому что без разрешения камеры `onResults` не вызывается → `setLoading(false)` не срабатывает. На реальном браузере с грантом — будет видна верхняя HUD-панель.
- Имя пакета `gemini-slingshot` в `package.json`, `package-lock.json` и `.claude/launch.json` оставил как есть — за пределами scope этой задачи (зафиксировано в `STATE.md` техдолгом).

## Verification
- `npx tsc --noEmit` → exit 0. ✅
- `npm run build` → `✓ built in 1.75s`, `dist/assets/index-vbb22pjM.js 202.76 kB │ gzip: 63.83 kB`. ✅
- Dev server (после рестарта): `No server errors found`, `No failed requests`. ✅
- Console: только ожидаемые `NotAllowedError: Permission denied`. ✅
- Screenshot подтверждает: загрузочный экран рендерится корректно, шрифт/тёмная тема на месте. ✅
- grep по `Bubble|Slingshot|bubble` в исходниках вне `package-lock.json`/`README.md`/`.claude/`/`package.json` — пусто. ✅

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** Троттлинг setState из MediaPipe-loop — подтверждённый паттерн. См. RETRO.md.
**Completed:** 2026-05-29
