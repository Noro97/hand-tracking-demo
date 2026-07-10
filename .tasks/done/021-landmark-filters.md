# 021 — Фильтры на руки и лица (landmark-anchored overlays)

**Status:** done (2026-07-10)
**Created:** 2026-07-06
**Origin:** user-requested ("Затем спланируйте добавление фильтров на руки и лица")
**Impact:** medium (showcase-трек, не medtech-ядро)  **Effort:** M-L  **Risk:** low
**Blocked by:** ~~задача 020 должна быть смержена~~ — PR #2 (ESLint) и PR #3 (face tracking) смержены в master перед началом (конфликты `.tasks/`+`package.json` между ними разрешены merge-коммитом на face-ветке)

## Goal
AR-фильтры, привязанные к landmarks: виртуальные очки/шляпа/усы на лицо, кольца/подсветка ногтей на пальцы. Рендер на существующем canvas-конвейере (2D, без WebGL/three.js в первой итерации).

## Планируемый дизайн
1. **`lib/filterRenderers.ts` — декларативный реестр фильтров** (по образцу `GESTURES`): каждый фильтр = `{ id, label, target: 'face' | 'hand', draw(ctx, landmarks, helpers) }`. Чистые draw-функции: берут landmarks + ctx, рисуют. Добавление фильтра = запись в реестр, без новых веток в движках.
2. **Якорение и трансформация** — переиспользовать `lib/faceMetrics.ts`/`lib/geometry.ts`:
   - Очки: центр между глазными уголками (FL.RIGHT_EYE_OUTER 33 ↔ FL.LEFT_EYE_OUTER 263), масштаб = межглазное расстояние, поворот = `headRollDeg`.
   - Шляпа: FL.FOREHEAD (10), масштаб = ширина висков (234↔454), тот же поворот.
   - Усы: между FL.NOSE_TIP (1) и FL.LIP_UPPER_INNER (13).
   - Кольцо: сегмент RING_PIP↔RING_DIP (LM 14→15) руки; масштаб = handSize.
   - Ногти: точки на 5 fingertips (LM 4/8/12/16/20), радиус ∝ handSize.
3. **Первая итерация — векторные фигуры canvas-примитивами** (path/arc/gradient), НЕ PNG-ассеты: ноль загрузок, идеальный масштаб, нет лицензионных вопросов. PNG/спрайты — вторая итерация, если захочется реализма.
4. **Подключение к движкам:** `HandEngine`/`FaceEngine` получают опциональный колбэк `getActiveFilters?: () => FilterId[]` (тот же паттерн, что удалённый `getEffect` из Draw-Demo эпохи — прецедент уже был в кодовой базе). Движок в конце render-шага прогоняет активные фильтры их draw-функциями. Identity колбэка — стабильный (ref-паттерн из урока задачи 017), чтобы переключение фильтров не перезапускало камеру.
5. **UI:** панель-переключатель фильтров на обоих экранах (чипы с иконками, multi-select). Состояние — `useState` + ref-зеркало для стабильного колбэка.
6. **Зеркало:** canvas CSS-зеркален — фильтры рисуются в НЕ-зеркальном пространстве и флипаются вместе с видео (корректно для симметричных фигур). НЕ использовать текст/асимметричные глифы в фильтрах — отзеркалятся.
7. **Тесты:** чистые helpers якорения (центр/масштаб/угол из landmarks) — юнит-тестируемы синтетическими landmarks; сами draw-функции (canvas side-effects) — вне юнит-скоупа, проверка на живой камере.

## Открытые вопросы — решены при реализации
- **Экран "оба сразу"** — НЕ делаем в первой итерации (два solution на одном потоке дороже по CPU; Holistic — смена стека). Реализовано: лицевые фильтры на экране Face Tracking, ручные — на НОВОМ отдельном экране "Hand Filters" (playground). Клинический BBT-экран не тронут — фильтров там нет.
- **Состав первой поставки:** 3 лицевых (Glasses, Hat, Mustache) + 2 ручных (Ring — на сегменте RING_PIP↔RING_DIP, Nails — 5 fingertips).

## Checklist
- [x] `lib/filterAnchors.ts` — `toPx`/`segmentTransform` (position+scale+rotation из пары landmarks) + 5 тестов (горизонталь/вертикаль/диагональ/масштабирование от размера canvas).
- [x] `lib/filterRenderers.ts` — декларативный реестр `FILTERS` (по образцу GESTURES) + draw-функции canvas-примитивами; каждая draw guard'ит отсутствующие landmarks; только симметричные фигуры (canvas зеркален CSS). + 3 теста реестра (уникальные id, партиция face/hand, устойчивость к пустым landmarks).
- [x] Движки: `getActiveFilters?: () => readonly string[]` в `FaceEngineCallbacks`/`HandEngineCallbacks`; вызов `drawActiveFilters` после отрисовки mesh/руки (per-hand для рук).
- [x] `hooks/useActiveFilters.ts` — общий хук: state для UI + ref-зеркало для стабильного колбэка (identity `[]`-deps — переключение фильтров НЕ перезапускает камеру, урок 017).
- [x] `hooks/useFaceTracking.ts`/`useHandTracking.ts` — прокидка `getActiveFilters`.
- [x] `components/FilterPicker.tsx` (общий чип-пикер), `FaceTrackingDemo` + пикер, новый `HandFilterDemo` (playground), `App.tsx` — три режима (BBT Rehab / Face Tracking / Hand Filters), таблица `SCREENS`.
- [x] tsc / lint / test (51, было 43) / build (236.39 kB) зелёные.
- [x] Preview: три режима переключаются, чипы Glasses/Hat/Mustache на Face-экране, Ring/Nails на Hand-экране, toggle меняет активное состояние, консоль — только ожидаемый `NotAllowedError`.

## Verification
- `npx tsc --noEmit` → 0; `npm run lint` → 0; `npm run test` → 51/51; `npm run build` → ✓ 633ms.
- Preview headless: все три экрана рендерятся, пикеры работают. Визуальная посадка фильтров (очки на глазах, кольцо на пальце) headless непроверяема — за пользователем на реальной камере; численные пропорции (радиусы/смещения ∝ длине якорного сегмента) — стартовые, калибровать по виду.

## Retro
**Rating:** _(ожидает оценки пользователя)_
