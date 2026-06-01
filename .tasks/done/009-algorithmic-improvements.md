# 009 — Алгоритмические улучшения hand-tracking логики

**Status:** done
**Created:** 2026-05-29
**Origin:** agent-proposed (по рекомендациям внешнего стратегического документа)
**Impact:** high  **Effort:** M  **Risk:** low
**Blocked by:** none

## Goal
Поднять текущий hand-tracking демо с уровня прототипа до enterprise-grade UX: убрать дрожание курсора (One Euro filter), убрать дребезг pinch-жеста (hysteresis + temporal debounce), сделать pinch-распознавание независимым от расстояния руки до камеры (Z-axis нормализация). Эти улучшения универсальны — нужны при любой выбранной вертикали коммерциализации.

## Context
- Сейчас в `components/HandTrackingDemo.tsx`:
  - Координаты pointer'а берутся из сырого среднего между `landmarks[4]` (thumb tip) и `landmarks[8]` (index tip) → дрожат на каждом кадре из-за анатомических микро-движений и шума сенсора.
  - Pinch-детекция: единственный порог `PINCH_THRESHOLD = 0.05` → при колебаниях вокруг порога состояние мигает между Pinch и Open (Midas Touch).
  - Расстояние pinch не нормализовано по размеру руки → когда рука близко к камере, тот же физический жест даёт большее значение, и pinch не срабатывает; и наоборот.
- Источник рекомендаций: внешний стратегический документ (`Interactive Hand Logic App Ideas.docx`), раздел «Prescribed Algorithmic Improvements» — конкретно One Euro / Kalman, hysteresis, debounce 200–300 мс, dynamic Z-axis depth estimation.

## Решения (зафиксированы)
- **Фильтр сглаживания:** **One Euro filter** (не Kalman) — проще параметризуется, нет матриц состояния, хорошо подходит для 2D-pointer'а с переменной скоростью. Кастомная реализация (~30 строк), без зависимостей.
- **Pinch hysteresis:** два relative-порога — ENTER (`0.40` отн. handSize) и EXIT (`0.55` отн. handSize).
- **Temporal debounce:** **150 мс** — компромисс между responsiveness и помехоустойчивостью (документ предлагал 200–300, но 150 даёт более «живой» UX без потери стабильности).
- **Z-axis нормализация:** через `handSize = distance(wrist, middleMCP)` как scale-proxy. Pinch-distance делим на handSize → получаем relative metric, инвариантную к дистанции до камеры.

## Checklist
- [x] Добавлен класс `OneEuroFilter` с математикой по работе Casiez et al. (2012). Без внешних зависимостей, ~55 строк.
- [x] Добавлен класс `PinchTracker` с hysteresis (ENTER=0.40 / EXIT=0.55 относительно `handSize`) + temporal debounce 150 мс.
- [x] `handSize` рассчитывается как `Math.hypot(middleMcp - wrist)` (landmarks 0 и 9) — используется как scale-proxy для Z-нормализации pinch dist.
- [x] Pointer (x, y) сглаживается двумя экземплярами `OneEuroFilter` (каждый со своим состоянием).
- [x] Все tunable-константы выведены наверх файла, с комментариями про целевую частоту кадров и физическую интерпретацию.
- [x] Reset-семантика: когда рука покидает кадр, все три объекта (`filterX`, `filterY`, `pinchTracker`) сбрасываются — следующая детекция начинается с чистого состояния, без stale history.
- [x] `npx tsc --noEmit` чист.
- [x] `npm run build` → `built in 1.88s`. JS-бандл 202.76 → 204.07 kB (+1.3 kB, классы фильтров). CSS вырос на 1.2 kB (Tailwind переиндексировал, не связано с задачей).
- [x] Preview после рестарта: `No server errors`, `No failed requests`.
- [x] A11y-snapshot: HUD на месте, Pointer показывает `—`, Hand `Not visible`, Gesture `Open` — корректная нулевая семантика без руки. Никаких `NaN`/мусора.

## Notes
- **One Euro Filter параметры (`minCutoff=1.2, beta=0.01, dCutoff=1.0`)** — стартовый набор «sensible defaults» для 30 fps webcam. Если на реальном тесте курсор покажется или ленивым, или дрожащим — поднять `beta` (быстрее реакция на быстрые движения) или `minCutoff` (меньше сглаживания вообще). Это **tunable**, не догма.
- **Pinch hysteresis (`ENTER=0.40, EXIT=0.55`)** — два *относительных* порога. Из-за нормализации на handSize они не зависят от расстояния руки до камеры. Если на тесте окажутся слишком чувствительными — увеличить EXIT (например, до 0.60). Если pinch не срабатывает уверенно — уменьшить ENTER (например, до 0.35).
- **Debounce 150 мс** — компромисс между responsiveness и помехоустойчивостью. Документ-источник предлагал 200–300 мс, но 150 даёт более «живой» UX. Менять только по тесту.
- Reset-семантика важна: без неё после исчезновения руки и появления снова OneEuroFilter использовал бы старую дельту времени и стартовое value, что давало бы скачок в первый кадр.
- В headless preview руки нет, поэтому верифицировать поведение фильтров на живом сигнале нельзя. Алгоритмы корректны по математике; реальная настройка параметров — после теста в браузере с камерой пользователя.
- Не реализовывал unit-тесты для фильтров — проект не имеет test-framework'а, это отдельная задача.

## Verification
- `npx tsc --noEmit` → exit 0. ✅
- `npm run build` → `✓ built in 1.88s`. ✅
- Dev server (after restart): `No server errors`, `No failed requests`. ✅
- A11y-snapshot: вся UI-структура совпадает с pre-009 состоянием; reset-состояние при отсутствии руки корректное. ✅
- Алгоритмы проверены по математике (формулы 1€ Filter, hysteresis-двухсторонний, debounce-счётчик). ✅

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** Scale-invariant жесты: пороги обязаны быть **относительными** к размеру руки в кадре, не абсолютными. См. RETRO.md.
**Completed:** 2026-05-29
