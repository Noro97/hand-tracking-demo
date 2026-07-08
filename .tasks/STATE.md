# Состояние проекта

Рабочая модель проекта для агента. Читается первой каждую сессию, обновляется каждую сессию.

## Стек
- **Сборщик:** Vite 6 + @vitejs/plugin-react
- **Язык:** TypeScript ~5.8
- **UI:** React 19 (+ `@types/react`, `@types/react-dom`), **Tailwind CSS v4 (локальная сборка через `@tailwindcss/vite`) с centralized palette в `index.css` `@theme`**, lucide-react (иконки)
- **CV/ML:** @mediapipe/hands 0.4.1646424915 + camera_utils 0.3.1640029074 + drawing_utils 0.3.1620248257 — обслуживаются локально из `public/mediapipe/` (артефакты регенерируются `scripts/copy-mediapipe.mjs` через `postinstall`)
- **AI:** удалён (задача 002).
- **Тесты:** Vitest (задача 015, расширено 017) — чистый логический слой (`lib/filters`, `lib/geometry`, `lib/recognition`, `lib/gestureEventDispatcher`, `features/bbtSession`, `features/replay`), `environment: 'node'`, свой `vitest.config.ts`. 37 тестов.
- **Линтер:** ESLint 9 flat config (задача 019) — typescript-eslint (type-aware), eslint-plugin-react-hooks (без `refs`/`immutability` — конфликтуют с намеренным паттерном "controller в ref", см. Решения), eslint-plugin-react-refresh. `npm run lint` чист.
- **Git:** инициализирован, история: `f6d9617` initial → `a1a0d20` post-refactor → `63fe45e` close-012 → `1e4bf06` persist-009/011 → task 013 → task 014 (part 1/2) → task 015 → task 016 → task 017 (PR #1, смержен в master 06.07.2026) → task 018 (clinician dashboard, ветка `claude/clinician-dashboard-foundation`, приостановлена) → task 019 (ESLint, ветка `claude/eslint-setup`) (см. Решения).

## Команды
- Сборка: `npm run build`
- Запуск dev: `npm run dev` (Vite, порт 3000)
- Превью сборки: `npm run preview`
- Type-check: `npx tsc --noEmit`
- Регенерация MediaPipe-артефактов: `npm run postinstall` (или `node scripts/copy-mediapipe.mjs`)
- Тесты: `npm run test` (once) / `npm run test:watch` (watch)
- Линт: `npm run lint`

## Определение готовности (DoD)
Задача считается готовой, когда выполнены все пункты:
- [ ] `npm run build` проходит без ошибок
- [ ] `npx tsc --noEmit` чист
- [ ] `npm run lint` чист
- [ ] `npm run test` зелёный (если задача трогает чистую логику в `lib/`/`features/bbtSession.ts` — новые сценарии должны получить тест, не только ручную проверку)
- [ ] В коде нет постороннего debug-вывода (необъяснённый `console.log`, закомментированные блоки кода)
- [ ] Не остаётся неиспользуемых импортов, файлов и зависимостей после изменений
- [ ] Dev-сервер открывает приложение без ошибок в консоли, кроме ожидаемого `NotAllowedError: Permission denied` от камеры в headless-окружении

## Текущий фокус
Пользователь подтвердил направление: **medtech B2B SaaS для реабилитации кисти** (`docs/STRATEGY.md` §6/§8, направление 4.1a) — официальная главная цель проекта, вопрос "что строим" закрыт. Задачи 013+014 реализовали и довели до рабочего состояния первый технический шаг MVP-плана §7 (недели 3-4): Box-and-Block-Test измерительный цикл — теперь единственный экран приложения, с выбором тестируемой руки перед стартом и толерантностью к MediaPipe handedness-relabel. **PR #1 смержен в `master`** (06.07.2026).

Пользователь запросил "strong custom debugging and testing tools... so agent could repair itself" — все три спланированные задачи реализованы: 015 (Vitest + 30 тестов), 016 (debug-панель), 017 (record/replay-механизм). 37 тестов, включая полный synthetic end-to-end replay. **Механизм готов, но цикл не замкнут** — реальной фикстуры от пользователя ещё нет; следующий шаг за пользователем — Record → Download на реальной камере, передать JSON.

**Задача 018 (clinician dashboard) приостановлена** на ветке `claude/clinician-dashboard-foundation` — код готов (Supabase-схема+RLS, auth, react-router, dashboard), но живая проверка заблокирована org-wide Supabase-квотой (`exceed_db_size_quota` от проекта "Proof"). Пользователь решил ждать сброса квоты/апгрейда — не переключаться на новую организацию, не трогать Proof.

**Задача 019 (ESLint) выполнена** на отдельной ветке `claude/eslint-setup` (от `master`, не связана с dashboard-веткой) — `npm run lint` чист с первого прогона, репо уже было дисциплинированным.

Следующие шаги: (а) пользователь тестирует BBT на реальной камере и/или присылает записанную фикстуру; (б) пользователь снимает Supabase-квоту → возобновить задачу 018; (в) неделя 5 плана §7 (clinician-dashboard) продолжается после 018.

## Заблокировано
- Задача 018 (clinician dashboard) — ждёт снятия Supabase org-квоты пользователем. Не блокирует ничего другого (независимая ветка).

## Реестр технического долга
- **Директория `projects/gemini-slingshot/`** всё ещё несёт legacy-имя (npm-пакет уже переименован в задаче 006). Переименование директории — отдельная задача с учётом ссылок в workspace `.claude/launch.json` и любых внешних шорткатов.
- **Workspace `.claude/launch.json`** содержит entry `"name": "gemini-slingshot"` с `--prefix projects/gemini-slingshot` — синхронизировать с переименованием директории.
- ~~Tests / Lint не настроены~~ — **Vitest настроен задачей 015, ESLint — задачей 019.** Оба закрыты.
- **`.mjs`-скрипты (`scripts/copy-mediapipe.mjs`) вне текущего ESLint-покрытия** (задача 019) — конфиг фокусируется на `.ts`/`.tsx`; расширение — мелкая будущая правка, если понадобится.
- **`engine/handEngine.ts` и React-слой (компоненты/хуки) не покрыты тестами** (задача 015, намеренно) — в основном DOM/canvas/MediaPipe-glue, низкая ценность на unit-уровне без jsdom+canvas-mock. Отдельная задача, если понадобится.
- **`.gitattributes`** не настроен; на Windows git предупреждает о LF→CRLF на каждом `add`. Не критично, но для команды с разными ОС — поставить `* text=auto eol=lf`.
- **README может расти** — сейчас минимальный, после первого внешнего showcase'а потребует скриншотов / GIF'а / описания жестов.
- **BBT-метрики (`features/bbtSession.ts`) в пикселях экрана, без физической калибровки** — `pathLengthPx`/`speedPxPerSec` не сравнимы между сессиями с разным разрешением/расстоянием до камеры. Достаточно для MVP-демо; для реального clinical pilot понадобится калибровка по референсному объекту известного размера в кадре (задача 013, зафиксировано в Notes).
- **Relabel-толерантность (задача 014) не проверена на реальной камере** — константы `RELABEL_GRACE_MS=250`, `RESUME_PROXIMITY_PX=120` (`features/bbtSession.ts`) — разумные стартовые значения по аналогии с `PINCH_DEBOUNCE_MS`/`MIN_TRANSFER_PATH_PX`, но не откалиброваны по реальному MediaPipe handedness-дрожанию. Механизм для этого теперь есть (задача 017: Record → Download fixture) — ждёт, чтобы пользователь его использовал.
- ~~Переключение режимов размонтирует камеру~~ — **снято задачей 014**: Draw Demo удалён, mode-switcher в `App.tsx` больше не существует, приложение — один экран (BBT Rehab).
- **Записанная фикстура фиксирует `canvasWidth`/`canvasHeight` только на момент `stop()`** (`hooks/useFrameRecorder.ts`) — если окно ресайзится посреди записи, partition-математика при replay будет неточной для части сессии до ресайза. Низкий приоритет — ресайз посреди 30-60с сессии редкий сценарий (задача 017, зафиксировано в Notes).
- **`test/fixtures/` пока не содержит ни одной реальной записи** — `features/replay.test.ts` использует только программно сгенерированную synthetic-фикстуру. Первая реальная фикстура появится, когда пользователь воспользуется Record-панелью (задача 017).

## Решения
<!-- новые сверху: дата, одна строка -->
### 2026-07-06 — Задача 019: ESLint 9 flat config добавлен. `react-hooks/refs`/`react-hooks/immutability` (новые React Compiler-ориентированные правила из eslint-plugin-react-hooks v7) отключены — конфликтуют с намеренным паттерном "лениво созданный controller в ref" (`useBBTSession.ts`), проект не использует React Compiler. Остальные правила (rules-of-hooks, exhaustive-deps, typescript-eslint type-aware) активны, `npm run lint` чист с первого прогона.
### 2026-07-06 — PR #1 смержен в `master` (merge commit, не squash — сохраняет гранулярность per-task коммитов). Задача 018 (clinician dashboard) начата на отдельной ветке от `master`, заблокирована Supabase org-квотой; пользователь решил ждать вместо смены организации.
### 2026-07-05 — Задача 017: `GestureEventDispatcher` вынесен из `engine/handEngine.ts` в `lib/` (переиспользуется движком и headless replay — иначе replay рисковал бы разойтись с реальным поведением). `BBTSessionController` получил injectable `now: () => number` (отход от решения задачи 015 — теперь есть второй реальный потребитель времени: `features/replay.ts`). `onRawFrame`/recorder-хук спроектированы так, чтобы НЕ пересоздавать `HandEngine` при переключении записи (стабильный callback identity через ref, не state, в deps).
### 2026-07-05 — Задачи 015/016: Vitest добавлен для чистого логического слоя (30 тестов, включая регрессии на relabel-фикс задачи 014); debug-панель в `BBTSessionDemo.tsx` показывает сырые relDist/handedness/pending-state. `Date.now()` в `BBTSessionController` контролируется в тестах через `vi.useFakeTimers()`, без injectable-clock параметра. Задача 017 (recording+replay) спланирована, не реализована — ждёт реальной записи от пользователя.
### 2026-07-04 — Задача 014: реальное тестирование на камере выявило 3 бага в задаче 013 (multi-gesture firing, оба руки считались одновременно, handedness-relabel путал руки). Draw Demo удалён целиком (пользователь подтвердил); BBT-сессия теперь привязана к одной выбранной руке; добавлена толерантность к relabel через `pendingSince`/`candidateHandedness` + proximity-check в `features/bbtSession.ts`. Коммиты продолжают ветку `claude/bbt-measurement-loop` / PR #1 — это докрутка того же ещё не смерженного PR, не новая задача с отдельным PR.
### 2026-07-04 — Пользователь подтвердил главную цель проекта: medtech B2B SaaS для реабилитации кисти (4.1a). Задача 013 реализует BBT измерительный цикл как первый технический шаг MVP-плана.
### 2026-07-04 — Обнаружены незакоммиченные изменения задач 009/011 (полный код существовал в working tree, но никогда не был закоммичен, хотя `.tasks/done/` и это STATE.md уже описывали их как готовые). Закоммичены отдельным коммитом `1e4bf06` до начала задачи 013, чтобы не смешивать чужой backlog с новой фичей.
### 2026-07-04 — BBT-компартменты названы нейтрально "A"/"B", не "left"/"right" — экран зеркалится глобальным CSS (`canvas { scaleX(-1) }`), а `pointer.x` живёт в НЕ-зеркальном координатном пространстве; директуальные английские слова были бы семантической ловушкой, не совпадающей с тем, что видит пользователь.
### 2026-05-29 — Публичный GitHub-репо `Noro97/hand-tracking-demo` создан и запушен; default branch `master` (Windows-git дефолт), не `main` — миграция при желании отдельной задачей.
### 2026-05-29 — Code-quality refactor: strict TS, модульная структура (`lib/`, `hooks/`), узкие MediaPipe-типы, theme-палитра, удалён шаблонный мусор. `HandTrackingDemo.tsx` 335 → 109 строк.
### 2026-05-29 — `docs/STRATEGY.md` расширен (287 → 402 строки): market sizing, sterile-OR как 4.1b, complementary monetization streams. Источник — внешний `.docx` от пользователя, оставлен на десктопе (не в репо).
### 2026-05-29 — Алгоритмические фильтры hand-tracking (One Euro + hysteresis + Z-нормализация) реализованы в `HandTrackingDemo.tsx`. Все tunable-константы наверху файла. Reset-семантика при потере руки в кадре.
### 2026-05-29 — Tailwind v4 через `@tailwindcss/vite` плагин, без `tailwind.config.js` и `postcss.config.js`. `font-roboto` определён через `@theme` в `index.css`.
### 2026-05-29 — Первый git commit (`f6d9617`) включает 25 файлов; `public/mediapipe/` корректно скрыт `.gitignore`.
### 2026-05-29 — npm-пакет переименован в `hand-tracking-demo`; директория и workspace-конфиг preview оставлены как есть (отдельный риск).
### 2026-05-29 — MediaPipe-артефакты регенерируются через `postinstall`, в git не коммитятся. Реальный размер: 23.8 МБ (а не «50», как было ранее в STATE).
### 2026-05-29 — Стратегическое направление коммерциализации: рекомендован вертикальный B2B SaaS для medtech-реабилитации кисти (`docs/STRATEGY.md`, раздел 8).
### 2026-05-29 — Имя пакета `gemini-slingshot` не переименовываем (вне scope сессии 1), фиксируем техдолгом. *(Решено в сессии 2, задача 006.)*
### 2026-05-29 — Артефакты задач, RETRO и стратегический бриф пишутся на русском; технические идентификаторы в коде — на английском.
### 2026-05-29 — `.tasks/` коммитится в git как часть истории репозитория.
### 2026-05-29 — Стратегический бриф размещается в `docs/STRATEGY.md`.
### 2026-05-29 — MediaPipe обслуживается локально из `public/mediapipe/` вместо jsdelivr CDN: устранены `Module.arguments` abort и проблемы кросс-доменной загрузки `.data`/`.wasm`.
