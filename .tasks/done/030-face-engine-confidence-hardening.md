# 030 — Confidence-hardening для FaceEngine

**Status:** done
**Created:** 2026-08-21
**Origin:** Аудит от 2026-07-10 (`.code-quality/reports/review-20260710-183850.md`)
**Impact:** medium (надёжность Face Mesh)  **Effort:** S  **Risk:** low
**Blocked by:** none

## 1. Проблема
В `engine/faceEngine.ts` оставались дефолтные значения `0.5` без именованных констант и документации, тогда как `HandEngine` уже получил hardening в задаче 022.

## 2. Решение
- Введены константы `MIN_DETECTION_CONFIDENCE = 0.7` и `MIN_TRACKING_CONFIDENCE = 0.7` в `engine/faceEngine.ts`.
- Добавлен комментарий с обоснованием выбора (предотвращение ложных детекций на одежде/тенях при сохранении стабильного трекинга лица).

## 3. Checklist
- [x] Именованные константы и документация в `engine/faceEngine.ts`
- [x] `npm run test` → 131/131 passed
- [x] `npm run lint` и `npx tsc --noEmit` чистые
- [x] `npm run build` успешен

## 4. Verification
- `npm run test` → 131/131 passed (17 files)
- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → built in 1.51s
