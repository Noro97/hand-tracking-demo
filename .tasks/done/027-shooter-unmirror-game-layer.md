# 027 — Фаза 0.1 шутера: снять зеркало с игрового слоя

**Status:** done
**Created:** 2026-08-21
**Origin:** `docs/SHOOTER-ROADMAP.md` §2.1
**Impact:** high (блокер для спрайтов и текста в шутере)  **Effort:** S  **Risk:** low
**Blocked by:** none

## 1. Проблема
Глобальное CSS-правило `canvas { transform: scaleX(-1) }` зеркалировало игровой холст (`gameCanvasRef`), из-за чего любой текст, очки и асимметричные спрайты отображались бы зеркально (задом наперёд).

## 2. Решение
- В `ShootingGameDemo.tsx` для `gameCanvasRef` задан `style={{ transform: 'none' }}`.
- В `lib/aiming.ts` реализована чистая функция `mirrorX(point | ray, width)` с полиморфной перегрузкой для `Point` и `Ray`.
- В `ShootingGameController.frame` луч прицеливания переводится в координаты незеркалированного игрового слоя через `mirrorX(rawRay, width)`.
- Добавлены тесты в `lib/aiming.test.ts` (включая проверку выравнивания луча с визуальным положением пальца на mirrored-видео).
- Обновлены тесты в `features/shootingGame.test.ts`.

## 3. Checklist
- [x] Реализовать `mirrorX` в `lib/aiming.ts`
- [x] Добавить тесты `mirrorX` в `lib/aiming.test.ts`
- [x] Использовать `mirrorX` в `features/shootingGame.ts`
- [x] `style={{ transform: 'none' }}` на `gameCanvasRef` в `components/ShootingGameDemo.tsx`
- [x] Обновить тесты в `features/shootingGame.test.ts`
- [x] `npm run test` → 119/119 passed
- [x] `npm run lint` и `npx tsc --noEmit` чистые
- [x] `npm run build` успешен

## 4. Verification
- `npm run test` → 119/119 passed (15 files)
- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → built in 1.44s
