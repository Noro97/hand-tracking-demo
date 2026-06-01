# 007 — Первичный git commit

**Status:** active
**Created:** 2026-05-29
**Origin:** user-requested (через «init git» + последующее планирование)
**Impact:** med  **Effort:** S  **Risk:** low
**Blocked by:** 005, 006 (оба done)

## Goal
Зафиксировать всё текущее состояние проекта одним осмысленным первичным коммитом. После задачи у репозитория есть `main` branch (или `master`, в зависимости от дефолта git) с одним коммитом, содержащим: hand-tracking demo, postinstall-инфраструктуру, переименованный пакет, `.tasks/` со всей сессионной историей, и `docs/STRATEGY.md`.

## Context
- `git init` уже сделан в предыдущей сессии; история пуста.
- `.gitignore` корректен: `node_modules/`, `dist/`, `public/mediapipe/`, `*.local`, редакторские артефакты.
- `package-lock.json` в свежем виде (после ренейма).
- В репо нет sensitive-файлов: `.env.local` удалён в 002, ключей нигде нет.
- Имя ветки: пусть будет дефолтное от git (на современных версиях — `main`; на старых — `master`). Не меняем явно.

## Checklist
- [ ] `git status` — проверить, что в untracked нет ничего лишнего (особенно `public/mediapipe/` должна быть скрыта `.gitignore`).
- [ ] `git add` — добавить только намеренные файлы (без `-A` для безопасности; перечислить директории явно: `App.tsx`, `index.tsx`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `types.ts`, `README.md`, `.gitignore`, `components/`, `scripts/`, `docs/`, `.tasks/`, `.claude/`).
- [ ] `git status --short` после `add` — все добавленные файлы зелёные (staged), `public/mediapipe/`, `node_modules/`, `dist/` не упомянуты.
- [ ] `git commit -m` с многострочным сообщением, описывающим состояние (отрефакторено из Gemini Slingshot bubble shooter в hand-tracking demo; постустроен postinstall для MediaPipe; написан стратегический бриф).
- [ ] `git log --oneline` — один коммит виден.
- [ ] `git ls-files | wc -l` — посчитать количество tracked-файлов, sanity check.

## Notes
_(заполняется по ходу выполнения)_

## Verification
_(заполняется на шаге 5)_
