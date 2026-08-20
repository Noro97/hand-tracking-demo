# 028 — Фаза 0.2–0.4 шутера: Спрайты, AudioBus, rAF-цикл

**Status:** done
**Created:** 2026-08-21
**Origin:** `docs/SHOOTER-ROADMAP.md` §3 (Фаза 0)
**Impact:** high (инфраструктура шутера)  **Effort:** M  **Risk:** low
**Blocked by:** none

## 1. Что сделано

1. **Фаза 0.2 (`lib/spriteSheet.ts` + 5 тестов):**
   - Реализован `CanvasSpriteAtlas` с поддержкой манифестов одиночных и анимированных спрайтов.
   - Метод `draw()` возвращает `boolean`: при отсутствии текстур или ошибке загрузки рендерер делает чистый векторный fallback.
   - `NULL_ATLAS` для безопасной работы без ассетов.

2. **Фаза 0.3 (`lib/audioBus.ts` + 4 теста):**
   - Web Audio шина `AudioBus` с процедурным синтезом звуков (лазер для выстрела, звонкий импакт для попадания, глухой клик для промаха, спавн, истечение таймера).
   - Поддержка `unlock()` по пользовательскому клику для прохождения browser autoplay policies.
   - Глобальный `mute`, регулировка громкости, безопасный no-op в headless/node окружении.

3. **Фаза 0.4 (rAF-цикл и разделение частот):**
   - В `ShootingGameController` разделены методы `tick(now, width, height)` (продвижение симуляции) и `input(hands, width, height, now)` (обработка жестов).
   - Метод `frame()` сохранён для обратной совместимости.
   - В `useShootingGame.ts` запущен 60fps rAF-цикл отрисовки и симуляции, полностью независимый от частоты детекции камеры.
   - В `ShootingGameDemo.tsx` добавлена кнопка переключения звука (Mute/Unmute).

## 2. Checklist
- [x] `lib/spriteSheet.ts` + `lib/spriteSheet.test.ts`
- [x] `lib/audioBus.ts` + `lib/audioBus.test.ts`
- [x] `features/shootingGame.ts` + `features/shootingGame.test.ts` (13 тестов)
- [x] `hooks/useShootingGame.ts` (rAF + AudioBus)
- [x] `features/shootingGameRenderer.ts` (SpriteAtlas fallback)
- [x] `components/ShootingGameDemo.tsx` (Mute button)
- [x] `npm run test` → 130/130 passed (17 files)
- [x] `npm run lint` и `npx tsc --noEmit` чистые
- [x] `npm run build` успешен

## 3. Verification
- `npm run test` → 130/130 passed (17 files)
- `npm run lint` → 0 errors
- `npx tsc --noEmit` → 0 errors
- `npm run build` → built in 1.59s
