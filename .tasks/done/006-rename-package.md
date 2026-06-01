# 006 — Переименовать npm-пакет `gemini-slingshot` → `hand-tracking-demo`

**Status:** done
**Created:** 2026-05-29
**Origin:** agent-proposed (из реестра техдолга `STATE.md`)
**Impact:** med  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Привести имя npm-пакета в соответствие с фактическим содержимым проекта после рефактора. После этой задачи `package.json.name`, `package-lock.json.name` и текстовые упоминания в `README.md` указывают на новое имя `hand-tracking-demo`. Имя директории и preview-server identifier — **вне scope** (см. ниже).

## Scope brake — что НЕ делаем в этой задаче
- **Не переименовываем директорию** `projects/gemini-slingshot/`. Это сломает `--prefix projects/gemini-slingshot` в workspace `.claude/launch.json`, существующий `git init` history (если будет), и любые внешние ссылки. Отдельная задача с собственным планом.
- **Не переименовываем preview-server identifier** в workspace `.claude/launch.json`. Это работающий конфиг для текущего препью-инструмента; переименование сломает `preview_start("gemini-slingshot")` посреди сессии.
- Если попутно всплывут другие упоминания «slingshot» / «bubble» в коде — фиксируем в Notes, но не правим вне согласованного списка файлов.

## Context
- `package.json` (поле `name`) → текущее значение `"gemini-slingshot"`.
- `package-lock.json` — top-level `name`, регенерируется через `npm install`.
- `.claude/launch.json` *в самом проекте* (не workspace) — был создан в начале сессии с `name: "gemini-slingshot"`. Не используется препью-инструментом, но лучше синхронизировать.
- `README.md` содержит явный комментарий «The npm package name is still `gemini-slingshot` for historical reasons» — после переименования эту строку надо убрать.
- `STATE.md` техдолг-запись об имени пакета — обновить после переименования.

## Checklist
- [x] `package.json`: `"name": "gemini-slingshot"` → `"name": "hand-tracking-demo"`.
- [x] `package-lock.json` перегенерирован через `npm install`; top-level и `packages[""]`.name == `"hand-tracking-demo"`.
- [x] `.claude/launch.json` *проекта* обновлён. Workspace `.claude/launch.json` не трогаем — это identifier preview-инструмента, его смена сломает текущую сессию.
- [x] `README.md`: убрана строка «npm package name is still gemini-slingshot». Добавлена честная сноска про то, что host-директория всё ещё несёт legacy-имя.
- [x] grep по проекту: оставшиеся 2 упоминания `gemini-slingshot` намеренные (см. Notes).
- [x] `npm run build` → `✓ built in 2.04s`, bundle не изменился (202.76 kB).
- [x] Preview server: `No server errors found`, `No failed requests`.

## Notes
- Оставшиеся допустимые упоминания `gemini-slingshot`:
  1. `docs/STRATEGY.md:4` — «Источник: репозиторий gemini-slingshot» как историческая ссылка на происхождение документа. Стратегический бриф — снэпшот во времени, не обязан гнаться за переименованиями.
  2. `README.md:25` — намеренная сноска про legacy-имя директории.
- Также `package-lock.json` содержит `gemini-slingshot` только внутри URL `@mediapipe/...@registry.npmjs.org/...` — это контрольные суммы пакетов, не наше имя.
- Workspace `.claude/launch.json` (`C:\Users\Others\Desktop\.claude\launch.json`) сохранил entry `"name": "gemini-slingshot"` с `--prefix projects/gemini-slingshot` — это identifier preview-инструмента + путь до директории. Менять оба одновременно с переименованием директории — отдельная задача с собственным планом (вне scope).

## Verification
- `package.json`: `"name": "hand-tracking-demo"` ✅
- `package-lock.json`: `name` (top) = `name` (packages[""]) = `"hand-tracking-demo"` ✅
- `.claude/launch.json` проекта: `"name": "hand-tracking-demo"` ✅
- `grep -r "gemini-slingshot" --exclude-dir={node_modules,dist,.git,.tasks,package-lock.json}` → 2 намеренных совпадения, оба в комментариях/документации, не в коде ✅
- `npm run build` → `built in 2.04s`, bundle 202.76 kB (без изменений) ✅
- Preview: чисто ✅

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** none — паттерн уже учтён в STATE.md как явный scope brake (npm-name vs directory vs identifier — разные объекты переименования).
**Completed:** 2026-05-29
