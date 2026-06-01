# Состояние проекта

Рабочая модель проекта для агента. Читается первой каждую сессию, обновляется каждую сессию.

## Стек
- **Сборщик:** Vite 6 + @vitejs/plugin-react
- **Язык:** TypeScript ~5.8
- **UI:** React 19 (+ `@types/react`, `@types/react-dom`), **Tailwind CSS v4 (локальная сборка через `@tailwindcss/vite`) с centralized palette в `index.css` `@theme`**, lucide-react (иконки)
- **CV/ML:** @mediapipe/hands 0.4.1646424915 + camera_utils 0.3.1640029074 + drawing_utils 0.3.1620248257 — обслуживаются локально из `public/mediapipe/` (артефакты регенерируются `scripts/copy-mediapipe.mjs` через `postinstall`)
- **AI:** удалён (задача 002).
- **Тесты:** не настроены
- **Линтер:** не настроен
- **Git:** инициализирован, 2 коммита (`f6d9617` initial + `a1a0d20` post-refactor), запушены в `origin/master` (https://github.com/Noro97/hand-tracking-demo, public).

## Команды
- Сборка: `npm run build`
- Запуск dev: `npm run dev` (Vite, порт 3000)
- Превью сборки: `npm run preview`
- Type-check: `npx tsc --noEmit`
- Регенерация MediaPipe-артефактов: `npm run postinstall` (или `node scripts/copy-mediapipe.mjs`)
- Тесты: n/a
- Линт: n/a

## Определение готовности (DoD)
Задача считается готовой, когда выполнены все пункты:
- [ ] `npm run build` проходит без ошибок
- [ ] `npx tsc --noEmit` чист
- [ ] В коде нет постороннего debug-вывода (необъяснённый `console.log`, закомментированные блоки кода)
- [ ] Не остаётся неиспользуемых импортов, файлов и зависимостей после изменений
- [ ] Dev-сервер открывает приложение без ошибок в консоли, кроме ожидаемого `NotAllowedError: Permission denied` от камеры в headless-окружении

## Текущий фокус
Проект на публичном GitHub: https://github.com/Noro97/hand-tracking-demo. 2 коммита запушены, working tree чистый (после третьего коммита, который добавит этот апдейт). Базовая инфраструктура, hand-tracking демо, strict-typed модульная структура, стратегический бриф — всё в репо. Следующий шаг — за пользователем: либо medtech-MVP по плану §7 STRATEGY.md, либо подготовка к расширению (rename директории, `main` вместо `master`, `.gitattributes`, tests/lint setup), либо новая вертикаль.

## Заблокировано
Нет блокировок.

## Реестр технического долга
- **Директория `projects/gemini-slingshot/`** всё ещё несёт legacy-имя (npm-пакет уже переименован в задаче 006). Переименование директории — отдельная задача с учётом ссылок в workspace `.claude/launch.json` и любых внешних шорткатов.
- **Workspace `.claude/launch.json`** содержит entry `"name": "gemini-slingshot"` с `--prefix projects/gemini-slingshot` — синхронизировать с переименованием директории.
- **Tests / Lint** не настроены — DoD опирается на ручной вызов `tsc --noEmit` и `vite build`. Если проект пойдёт в продакшен — настроить Vitest + ESLint.
- **`.gitattributes`** не настроен; на Windows git предупреждает о LF→CRLF на каждом `add`. Не критично, но для команды с разными ОС — поставить `* text=auto eol=lf`.
- **README может расти** — сейчас минимальный, после первого внешнего showcase'а потребует скриншотов / GIF'а / описания жестов.

## Решения
<!-- новые сверху: дата, одна строка -->
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
