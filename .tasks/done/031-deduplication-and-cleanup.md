# 031 — Дедупликация shell-компонентов и зачистка техдолга

**Status:** done
**Created:** 2026-08-21
**Origin:** Аудит от 2026-07-10 (`.code-quality/reports/review-20260710-183850.md`)
**Impact:** medium (чистота кодовой базы)  **Effort:** S  **Risk:** low
**Blocked by:** none

## 1. Что сделано

1. **Единый компонент `HudRow` (`components/HudRow.tsx`):**
   - Вынесен общий компонент строки метрики (`text-sm`, `font-mono`, `text-text-muted`).
   - Использован в `BBTSessionDemo.tsx`, `FaceTrackingDemo.tsx`, `ShootingGameDemo.tsx` (устранён рассинхрон шрифта на экране лица).

2. **Дедупликация скачивания JSON (`lib/download.ts` + 2 теста):**
   - Реализована функция `downloadJson(data, filename)`.
   - Использована в `features/bbtSession.ts` (`exportJson`) и `hooks/useFrameRecorder.ts` (`download`).

3. **Инвариант направления зависимостей:**
   - Интерфейс `RawHandFrame` перенесён в `lib/recognition.ts`.
   - Зависимость `lib/fixtures.ts` от `engine/handEngine.ts` устранена.

4. **Зачистка мёртвых экспортов:**
   - `lib/landmarks.ts`: удалены неиспользуемые `FingerName`, `FINGER_TIP`, `FINGER_MCP`.
   - `lib/faceLandmarks.ts`: удалён неиспользуемый `FL.CHIN`.
   - `lib/colors.ts`: удалены `landmarkLine`, `cursorIdle`.
   - `lib/gestures.ts`: удалено неиспользуемое поле `GestureDef.label`.

## 2. Checklist
- [x] Создать `components/HudRow.tsx` и заменить дубли
- [x] Создать `lib/download.ts` и `lib/download.test.ts`
- [x] Использовать `downloadJson` в `bbtSession.ts` и `useFrameRecorder.ts`
- [x] Перенести `RawHandFrame` в `lib/recognition.ts`
- [x] Очистить мёртвые экспорты
- [x] `npm run test` → 133/133 passed (18 files)
- [x] `npm run lint` и `npx tsc --noEmit` чистые
- [x] `npm run build` успешен

## 3. Verification
- `npm run test` → 133/133 passed (18 files)
- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → built in 1.47s
