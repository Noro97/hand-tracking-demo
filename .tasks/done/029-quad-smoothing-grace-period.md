# 029 — Grace-период для сглаживания квада в SceneEffectRenderer

**Status:** done
**Created:** 2026-08-21
**Origin:** Аудит от 2026-07-10 (`.code-quality/reports/review-20260710-183850.md`)
**Impact:** medium (плавность вирт. экрана)  **Effort:** S  **Risk:** low
**Blocked by:** none

## 1. Проблема
В `SceneEffectRenderer` (`lib/sceneEffects.ts`) при потере руки хотя бы на 1 кадр фильтры сглаживания (`OneEuroFilter`) немедленно сбрасывались в `null`. При возвращении рук на следующем кадре сглаживание начиналось с нуля, вызывая визуальный скачок рамки экрана.

## 2. Решение
- Введён `QUAD_GRACE_MS = 250` и отслеживание `lastSeenAt`.
- Фильтры сохраняются в течение grace-окна при кратковременной потере детекции рук и сбрасываются только при отсутствии рук >250 мс.
- Добавлен безопасный фабричный метод буфера для headless/node окружений.
- Добавлен тест в `lib/sceneEffects.test.ts`.

## 3. Checklist
- [x] Внедрить `QUAD_GRACE_MS` и `lastSeenAt` в `lib/sceneEffects.ts`
- [x] Добавить тест в `lib/sceneEffects.test.ts`
- [x] `npm run test` → 131/131 passed
- [x] `npm run lint` и `npx tsc --noEmit` чистые
- [x] `npm run build` успешен

## 4. Verification
- `npm run test` → 131/131 passed (17 files)
- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → built in 1.56s
