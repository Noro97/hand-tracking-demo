# 005 — `public/mediapipe/` в `.gitignore` + postinstall-копирование

**Status:** done
**Created:** 2026-05-29
**Origin:** agent-proposed (из реестра техдолга `STATE.md`)
**Impact:** med  **Effort:** S  **Risk:** low
**Blocked by:** none

## Goal
Вынести `public/mediapipe/` из git (`.gitignore`) и научить проект автоматически воссоздавать эту папку из `node_modules/@mediapipe/*` через `postinstall`-скрипт. Цель: не носить ~50 МБ бинарных артефактов в git-истории, при этом сохранить «склонировал → npm install → npm run dev» без ручных шагов.

## Context
- В `public/mediapipe/hands/`, `public/mediapipe/camera_utils/`, `public/mediapipe/drawing_utils/` лежат `.js`, `.wasm`, `.data`, `.tflite`, `.binarypb` — суммарно ~50 МБ.
- Версии пакетов уже зафиксированы в `package.json`: `@mediapipe/hands@0.4.1646424915`, `camera_utils@0.3.1640029074`, `drawing_utils@0.3.1620248257`.
- index.html ссылается на `/mediapipe/<pkg>/<file>.js`, локатор в коде — `/mediapipe/hands/${file}` → если файлов не будет, MediaPipe не загрузится → 404 на старте.

## Решение (зафиксировано)
`.gitignore` + Node-скрипт `scripts/copy-mediapipe.mjs`, вызываемый из `package.json` через `postinstall`. Альтернатива (коммитить как есть) отброшена: 50 МБ бинарей раздувают историю, замедляют клонирование, и при апгрейде версий потребуют отдельных коммитов на бинари.

## Checklist
- [x] Создан `scripts/copy-mediapipe.mjs`: для каждого из `hands`/`camera_utils`/`drawing_utils` пересоздаёт `public/mediapipe/<pkg>/` и копирует все файлы из `node_modules/@mediapipe/<pkg>/`.
- [x] Добавлен `"postinstall": "node scripts/copy-mediapipe.mjs"` в `package.json`.
- [x] Добавлено правило `/public/mediapipe/` в `.gitignore` с комментарием-указателем на скрипт.
- [x] Проверено: после `rm -rf public/mediapipe && node scripts/copy-mediapipe.mjs` папка пересоздаётся; вывод скрипта: hands 14 файлов / 23.8 МБ, camera_utils 4, drawing_utils 4.
- [x] `npm run build` → `✓ built in 1.91s`, bundle размер не изменился (202.76 kB).
- [x] Превью после рестарта: `No failed requests`, `No server errors`.

## Notes
- Реальный размер артефактов оказался **23.8 МБ**, а не «~50 МБ», как я раньше указал в STATE.md. Уточню при следующем апдейте STATE.
- Использовал Node.js встроенный `node:fs` (без зависимостей) — кросс-платформенно. Альтернатива через `vite-plugin-static-copy` потребовала бы dev-зависимость и не работала бы вне Vite-контекста.
- `postinstall` запускается на каждый `npm install` — это норм, копирование 24 МБ занимает <1 сек.
- Файлы README.md / index.d.ts / package.json внутри `@mediapipe/<pkg>` копируются тоже — не строго нужны на runtime, но безвредны (читать через `/mediapipe/.../README.md` смешно, но никто этого не делает).
- В скрипте есть `statSync(...).isFile()` фильтр — на случай, если внутри пакета появятся подпапки в будущих версиях. Текущие версии плоские.

## Verification
- `node scripts/copy-mediapipe.mjs` → exit 0, лог:
  ```
  [copy-mediapipe] hands: 14 files, 23.8 MB
  [copy-mediapipe] camera_utils: 4 files, 0.0 MB
  [copy-mediapipe] drawing_utils: 4 files, 0.0 MB
  [copy-mediapipe] total: 23.8 MB → public/mediapipe/
  ```
- `git check-ignore -v public/mediapipe/hands/hands.js` → `.gitignore:17:/public/mediapipe/`. ✅
- `git status --short` больше не показывает `public/`. ✅
- `npm run build` → green, bundle 202.76 kB. ✅
- Preview server (после рестарта): `No failed requests`, `No server errors`. ✅

## Retro
**Rating:** 5/5
**Comment:** (без комментария)
**Lesson:** none (паттерн «postinstall + .gitignore для runtime-блобов» — общепринятая практика; RETRO не засоряем).
**Completed:** 2026-05-29
