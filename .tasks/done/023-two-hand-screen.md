# 023 — Two-hand screen: стилизованный "экран" между руками (skindeck-style)

**Status:** done
**Created:** 2026-07-10
**Origin:** user-requested со скриншотами-референсами (skindeck.higgsfield.app): виртуальный экран, растянутый между двумя руками, внутри — стилизованная версия камеры
**Impact:** medium (showcase-трек)  **Effort:** M  **Risk:** low
**Blocked by:** none

## Решения пользователя (из вопросов перед планированием)
- Контент внутри рамки: **стилизованный живой фид камеры** (как в референсах), не внешний ассет.
- Активация: **авто, когда обе руки видны** (эффект выбран чипом) — без отдельного activation-жеста.
- Эффекты v1: **Poster (pink duotone)** + **ASCII**.

## Решения (зафиксированы)
- **Scene effects — новый концепт рядом с per-hand фильтрами**, НЕ запись в `FILTERS`-реестре: нужен доступ к ОБЕИМ рукам + текущему видеокадру (`results.image`), чего per-hand контракт (`draw(ctx, landmarks, w, h)`) не даёт. Отдельный хук движка `getActiveSceneEffect?: () => string | null`, вызывается после per-hand цикла.
- **Углы квада:** index tip (верх) + thumb tip (низ) каждой руки → TL/TR/BR/BL (`lib/quadMapping.ts::quadFromHands`). null, если любая рука/landmark отсутствует — экран существует только между двумя руками.
- **Проекция на наклонный квад — canvas 2D, без WebGL:** квад делится на 2 треугольника, каждый рисуется через аффинное преобразование (`affineFromTriangle` — решение 6 коэффициентов из 3 соответствий точек, null при вырожденном треугольнике). Шов между треугольниками прячется раздуванием clip-путей на ~0.5px от центроида. Чистая математика — 6 юнит-тестов (точное соответствие вершин, identity, вырожденный случай).
- **Сглаживание углов:** сырые fingertip-landmarks дрожат (сглажен только pointer). `SceneEffectRenderer` держит 8 `OneEuroFilter` (4 угла × x,y) с существующими константами; сброс при исчезновении экрана — пересобранный экран не «доезжает» с прошлой позиции.
- **Стилизация на low-res оффскрин буфере 192×108** — lo-fi вид (как в референсах) и дешёвый per-pixel проход (~20K px/кадр). `imageSmoothingEnabled = false` при растяжке на квад.
- **Poster:** luminance → 4 полосы → палитра [тень, розовый #ec4899, серый, свет] (`posterColor`, чистая, тестируется).
- **ASCII:** сетка 6px-ячеек, глиф по luminance из рампы ` .:+*=#` — **только горизонтально-симметричные глифы** (канвас CSS-зеркален); тест буквально enforce'ит symmetric-set, чтобы никто позже не добавил 'b' или '/'. Цвет глифа по яркости (белый/розовый/серый), фон тёмный.
- **UI:** `FilterPicker` переработан на секции (`sections: [{title, items, active, onToggle}]`) — одна панель, две группы ("Filters" per-hand, "Screen" scene) на Hand Filters экране; Face-экран передаёт одну секцию. `hooks/useSceneEffect.ts` — single-select аналог `useActiveFilters` (чип-toggle, стабильный getter через ref — камера не перезапускается).
- BBT и Face экраны не тронуты (кроме адаптации FaceTrackingDemo к новому API пикера).

## Checklist
- [x] `lib/quadMapping.ts` (`affineFromTriangle`, `quadFromHands`, `drawImageInQuad`) + 6 тестов.
- [x] `lib/sceneEffects.ts` (`posterColor`, `asciiGlyph`/`ASCII_RAMP`, `SCENE_EFFECTS`, `SceneEffectRenderer`) + 6 тестов (палитра, границы полос, монотонность рампы, symmetric-глифы, уникальность реестра).
- [x] `engine/handEngine.ts`: `getActiveSceneEffect` колбэк + `SceneEffectRenderer` instance, вызов после per-hand цикла.
- [x] `hooks/useHandTracking.ts` прокидывает колбэк; `hooks/useSceneEffect.ts` новый.
- [x] `components/FilterPicker.tsx` → секции; `HandFilterDemo.tsx` две секции + обновлённая подсказка; `FaceTrackingDemo.tsx` адаптирован.
- [x] tsc / lint / test (66, было 54) / build (240.47 kB) зелёные.
- [x] Preview: чипы Poster/ASCII single-select (выбор одного снимает другой), повторный клик снимает выбор, Face-экран рендерится с новым API пикера, консоль — только ожидаемый `NotAllowedError`.

## Notes
- **Визуальный вид эффектов headless непроверяем** (нет камеры): стилизация, посадка квада между пальцами, дрожание углов, шов треугольников — за пользователем на реальной камере. Палитра/пороги/размер буфера — стартовые значения, калибровать по виду.
- **Перф-ожидание:** poster ~20K px getImageData/putImageData на кадр + ascii ~576 fillText — должно держать 30fps на десктопе; если нет — уменьшить буфер (первое, что крутить).
- Аффинное (не проективное) отображение слегка искажает сильно «перспективные» квады (canvas 2D ограничение) — приемлемо для эффекта; WebGL — если захочется идеальной проекции (отдельная задача).
- Открытый HIGH из аудита 10.07 (BBT persisted-relabel) — НЕ в этой задаче, остаётся следующим кандидатом.

## Verification
- `npx tsc --noEmit` → 0; `npm run lint` → 0; `npm run test` → 66/66; `npm run build` → ✓ 716ms.
- Preview: секции чипов работают (single-select semantics подтверждены кликами), оба экрана рендерятся.

## Retro
**Rating:** _(ожидает оценки пользователя)_
