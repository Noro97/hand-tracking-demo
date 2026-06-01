# 011 — Применить все находки code-quality аудита: refactor + cleanup

**Status:** done
**Created:** 2026-05-29
**Origin:** user-requested («fix all, improve code, remove dead and legacy code, refactor» после `/code-quality` audit)
**Impact:** high  **Effort:** L  **Risk:** med (большой объём правок в strict-режиме TS, риск введения регрессий)
**Blocked by:** none

## Goal
Закрыть все findings из аудита (3 HIGH, 5 MEDIUM, 6 LOW, 2 NIT) одной волной + структурный рефакторинг: вынести filtering-примитивы и MediaPipe-loop из компонента, типизировать window-глобалы, добавить strict TS, убрать шаблонный мусор от AI Studio. Внешнее поведение не меняется. После задачи: `tsc --noEmit` strict-clean, build green, preview без ошибок, число строк в `HandTrackingDemo.tsx` снижено ≥50%.

## Scope — что включено

### Из audit findings
- **[HIGH] strict TypeScript** — `strict: true` + `noUncheckedIndexedAccess: true` в `tsconfig.json`, починить все surfacing-баги.
- **[HIGH] willReadFrequently=true ошибочный флаг** — убрать.
- **[HIGH] importmap из шаблона AI Studio** — удалить из `index.html`.
- **[MEDIUM] mounted-guard для setState race** — добавить в hook.
- **[MEDIUM] setLoading на каждом кадре** — guard'нуть после первого вызова.
- **[MEDIUM] window.Hands и др. как any** — заменить на узкие интерфейсы (`Hands`, `Camera`, `NormalizedLandmark`, `HandsResults` и т.д.).
- **[MEDIUM] HandTrackingDemo.tsx 335 строк** — вынести в `lib/filters.ts` + `lib/colors.ts` + `hooks/useHandTracking.ts`. Компонент сводится к HUD ≤ 150 строк.
- **[MEDIUM] tsconfig мёртвые опции** — `experimentalDecorators`, `allowJs`, `useDefineForClassFields` убрать.
- **[LOW] section-banner comments** — удалить.
- **[LOW] SPDX-хедеры на всех файлах** — удалить (нет `LICENSE`-файла, шаблонный артефакт).
- **[LOW] hex-цвета дублированы между Tailwind и canvas** — централизовать в `lib/colors.ts` для canvas, `@theme` block для Tailwind.
- **[LOW] App.tsx wrapper** — убрать.
- **[LOW] magic numbers радиусов pointer'а** — константы.
- **[LOW] canvas resize check на каждом кадре** — ResizeObserver.
- **[NIT] statSync дважды в `copy-mediapipe.mjs`** — закэшировать.
- **[NIT] Math.hypot vs Math.sqrt** — игнорируем.

## Scope — что НЕ включено
- **Тесты** — нет test-framework'а, отдельная задача.
- **Lint** (ESLint) — отдельная задача.
- **Rename директории** `gemini-slingshot/` — отдельная задача.
- **MediaPipe через ES-import** (вместо `<script>` в HTML) — отдельная задача, требует проверки совместимости `Camera`/`locateFile` в ES-режиме.
- **LICENSE-файл** — отдельное решение пользователя.

## Checklist

### Структура: новые модули
- [ ] `lib/filters.ts` — `OneEuroFilter`, `PinchTracker`, tunable константы.
- [ ] `lib/colors.ts` — canvas color constants.
- [ ] `hooks/useHandTracking.ts` — кастомный хук, инкапсулирующий MediaPipe loop, ResizeObserver, mounted-guard, setState-throttle.

### Типы
- [ ] `types.ts` → узкие интерфейсы `NormalizedLandmark`, `HandsResults`, `Hands`, `HandsConstructor`, `Camera`, `CameraConstructor`, `DrawConnectorsFn`, `DrawLandmarksFn`. Глобал `Window` использует их.
- [ ] Опционально вынести в `types/mediapipe.ts` если станет крупным.

### Конфиг
- [ ] `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, убрать `experimentalDecorators`/`allowJs`/`useDefineForClassFields`.
- [ ] `index.html`: убрать `<script type="importmap">`.
- [ ] `index.css`: добавить `@theme` block с centralized palette.

### Компонент
- [ ] `HandTrackingDemo.tsx` — переписать: только HUD + canvas refs + вызов хука. Цель: ≤ 150 строк.
- [ ] `App.tsx`: убрать wrapper-div, рендерить `<HandTrackingDemo />` напрямую.
- [ ] Убрать SPDX-хедеры из `App.tsx`, `index.tsx`, `types.ts`, `HandTrackingDemo.tsx`.

### Скрипты
- [ ] `scripts/copy-mediapipe.mjs`: один `statSync` на файл.

### DoD
- [ ] `npx tsc --noEmit` чист в strict + noUncheckedIndexedAccess режимах.
- [ ] `npm run build` зелёный.
- [ ] Preview: `No server errors`, `No failed requests`.
- [ ] A11y-snapshot: вся UI на месте, нулевая семантика для loading/HUD корректная.
- [ ] grep по `// ===|@license|SPDX-License-Identifier` — ноль совпадений в исходниках вне `node_modules`/`docs`/`.tasks`.
- [ ] `wc -l components/HandTrackingDemo.tsx` ≤ 150 (был 335).

## Notes
- **Структура repo поменялась:** появились `lib/filters.ts`, `lib/colors.ts`, `hooks/useHandTracking.ts`. Это первый раз, когда проект имеет настоящую модульную структуру.
- **Strict TS surface'нул реальные дыры:**
  - `landmarks[8]` теперь `NormalizedLandmark | undefined` → добавлены guards (`if (landmarks && wrist && thumbTip && idxTip && middleMcp)`).
  - `entry` из ResizeObserver — `ResizeObserverEntry | undefined` → guard.
  - `window.Hands`/`Camera`/etc. — теперь типизированы как опциональные с узкими интерфейсами.
- **`@types/react` + `@types/react-dom`** пришлось доставить — раньше React-импорты были implicit `any`. Это был тихий пробел в проекте; теперь IDE даёт autocomplete + проверки.
- **`useRef<T>(null)` под strict-режимом** возвращает `RefObject<T | null>`. Соответственно сигнатура хука `useHandTracking(videoRef: RefObject<HTMLVideoElement | null>, ...)`.
- **Tailwind theme-палитра в `index.css`** — все цвета теперь через CSS-переменные. JSX использует именованные классы (`bg-page`, `text-accent-green`, `border-border`). Магических hex-значений в JSX больше нет.
- **Canvas colors** — отдельный `lib/colors.ts` для drawing-API (canvas не читает Tailwind). Те же hex-значения, что и в `@theme` — single source of truth по соглашению (если меняете один — поменяйте оба).
- **Компонент разбит на под-компоненты** в одном файле: `MobileBlocker`, `LoadingOverlay`, `StatusPanel`, `StatusRow`. Можно при желании вынести в `components/hud/`, но 109 строк не требуют.
- **`setLoading` теперь срабатывает один раз** через `hasReportedReadyRef` — больше не дёргает React-редьюсер на каждом из 30 кадров.
- **ResizeObserver** заменил per-frame resize-check; reflow trigger исчез.
- **Mounted-guard** в хуке: `let mounted = true; ... if (!mounted) return; ... return () => { mounted = false; ... }`. Race на setState после unmount закрыт.
- **CSS-asset вырос с 13.77 → 14.75 kB (gzip 3.42 → 3.60 kB)** — это новые theme-переменные. Прирост незаметный.
- **JS-бандл практически не изменился** (204.07 → 204.49 kB). Структурный рефакторинг без regression по размеру.

## Verification
- `npx tsc --noEmit` под `strict: true` + `noUncheckedIndexedAccess: true` → exit 0, чисто. ✅
- `npm run build` → `✓ built in 1.84s`, bundle стабилен. ✅
- Preview после рестарта: `No server errors`, `No failed requests`. ✅
- A11y-snapshot: вся UI на месте (Title, HUD, loading overlay, instruction). Title корректный «Hand Tracking Demo». ✅
- `wc -l components/HandTrackingDemo.tsx` → **109** (цель ≤ 150, было 335; −68%). ✅
- `grep -rn "SPDX-License-Identifier|@license|// ===" src` → **0 совпадений** в исходниках. ✅
- Все 16 findings из аудита закрыты:
  - 3 HIGH: strict TS / willReadFrequently / importmap — ✅
  - 5 MEDIUM: mounted-guard / setLoading once / типы window / разбиение / dead tsconfig — ✅
  - 6 LOW: banners / SPDX / palette / App wrapper / magic numbers / ResizeObserver — ✅
  - 1 NIT (statSync) — ✅; второй (Math.hypot) — намеренно не трогали.

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** Включение `strict: true` — это fix-cascade, не точечная правка. См. RETRO.md.
**Completed:** 2026-05-29
